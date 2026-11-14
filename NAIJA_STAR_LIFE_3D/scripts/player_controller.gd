extends CharacterBody3D
class_name StarLifePlayerController

@export var walk_speed: float = 4.2
@export var run_speed: float = 6.8
@export var acceleration: float = 18.0
@export var jump_velocity: float = 4.5
@export var mouse_sensitivity: float = 0.0025
@export var touch_look_sensitivity: float = 0.004
@export var virtual_stick_radius: float = 92.0

@onready var camera_pivot: Node3D = $CameraPivot

var gravity: float = float(ProjectSettings.get_setting("physics/3d/default_gravity"))
var camera_pitch: float = -0.18
var move_touch_index: int = -1
var look_touch_index: int = -1
var move_touch_origin: Vector2 = Vector2.ZERO
var move_touch_position: Vector2 = Vector2.ZERO
var touch_move_vector: Vector2 = Vector2.ZERO

func _ready() -> void:
	camera_pivot.rotation.x = camera_pitch

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		_handle_screen_touch(event)
	elif event is InputEventScreenDrag:
		_handle_screen_drag(event)
	elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_RIGHT:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED if event.pressed else Input.MOUSE_MODE_VISIBLE
	elif event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		_rotate_camera(event.relative.x, event.relative.y, mouse_sensitivity)
	elif event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE

func _handle_screen_touch(event: InputEventScreenTouch) -> void:
	var screen_width := get_viewport().get_visible_rect().size.x
	if event.pressed:
		if event.position.x < screen_width * 0.48 and move_touch_index == -1:
			move_touch_index = event.index
			move_touch_origin = event.position
			move_touch_position = event.position
			touch_move_vector = Vector2.ZERO
		elif event.position.x >= screen_width * 0.48 and look_touch_index == -1:
			look_touch_index = event.index
	else:
		if event.index == move_touch_index:
			move_touch_index = -1
			touch_move_vector = Vector2.ZERO
		if event.index == look_touch_index:
			look_touch_index = -1

func _handle_screen_drag(event: InputEventScreenDrag) -> void:
	if event.index == move_touch_index:
		move_touch_position = event.position
		var drag := (move_touch_position - move_touch_origin) / virtual_stick_radius
		touch_move_vector = Vector2(clampf(drag.x, -1.0, 1.0), clampf(drag.y, -1.0, 1.0))
		if touch_move_vector.length() > 1.0:
			touch_move_vector = touch_move_vector.normalized()
	elif event.index == look_touch_index:
		_rotate_camera(event.relative.x, event.relative.y, touch_look_sensitivity)

func _rotate_camera(delta_x: float, delta_y: float, sensitivity: float) -> void:
	camera_pivot.rotate_y(-delta_x * sensitivity)
	camera_pitch = clampf(camera_pitch - delta_y * sensitivity, -0.85, 0.35)
	camera_pivot.rotation.x = camera_pitch

func _physics_process(delta: float) -> void:
	if not is_on_floor():
		velocity.y -= gravity * delta
	if Input.is_action_just_pressed("jump") and is_on_floor():
		velocity.y = jump_velocity

	var input_vector := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
	if touch_move_vector.length_squared() > 0.001:
		input_vector = touch_move_vector
	var move_direction := camera_pivot.global_basis * Vector3(input_vector.x, 0.0, input_vector.y)
	move_direction.y = 0.0
	move_direction = move_direction.normalized()

	var target_speed := run_speed if Input.is_key_pressed(KEY_SHIFT) else walk_speed
	var horizontal := Vector3(velocity.x, 0.0, velocity.z)
	horizontal = horizontal.move_toward(move_direction * target_speed, acceleration * delta)
	velocity.x = horizontal.x
	velocity.z = horizontal.z

	if move_direction.length_squared() > 0.001:
		var target_rotation := atan2(-move_direction.x, -move_direction.z)
		rotation.y = lerp_angle(rotation.y, target_rotation, minf(10.0 * delta, 1.0))
	move_and_slide()
