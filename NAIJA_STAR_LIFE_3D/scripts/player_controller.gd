extends CharacterBody3D
class_name StarLifePlayerController

@export var walk_speed: float = 4.2
@export var run_speed: float = 6.8
@export var acceleration: float = 18.0
@export var jump_velocity: float = 4.5
@export var mouse_sensitivity: float = 0.0025

@onready var camera_pivot: Node3D = $CameraPivot

var gravity: float = float(ProjectSettings.get_setting("physics/3d/default_gravity"))
var camera_pitch: float = -0.18

func _ready() -> void:
	camera_pivot.rotation.x = camera_pitch

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_RIGHT:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED if event.pressed else Input.MOUSE_MODE_VISIBLE
	elif event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		camera_pivot.rotate_y(-event.relative.x * mouse_sensitivity)
		camera_pitch = clampf(camera_pitch - event.relative.y * mouse_sensitivity, -0.85, 0.35)
		camera_pivot.rotation.x = camera_pitch
	elif event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE

func _physics_process(delta: float) -> void:
	if not is_on_floor():
		velocity.y -= gravity * delta
	if Input.is_action_just_pressed("jump") and is_on_floor():
		velocity.y = jump_velocity

	var input_vector := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
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
