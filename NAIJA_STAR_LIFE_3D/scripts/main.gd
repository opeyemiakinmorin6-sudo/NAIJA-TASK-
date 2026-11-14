extends Node3D

const PLAYER_SCENE: PackedScene = preload("res://scenes/player.tscn")
const ACTIVITY_SCENE: PackedScene = preload("res://scenes/activity_station.tscn")

var demo_star_coins: int = 0
var status_label: Label
var balance_label: Label
var interact_button: Button
var current_player: StarLifePlayerController

func _ready() -> void:
	_build_test_ground()
	_build_lighting()
	_build_player()
	_build_first_activity()
	_build_hud()

func _build_player() -> void:
	current_player = PLAYER_SCENE.instantiate() as StarLifePlayerController
	current_player.position = Vector3(0.0, 0.0, 4.0)
	add_child(current_player)
	current_player.prompt_changed.connect(_on_prompt_changed)
	current_player.activity_completed.connect(_on_activity_completed)

func _build_first_activity() -> void:
	var station: Node3D = ACTIVITY_SCENE.instantiate() as Node3D
	station.position = Vector3(0.0, 0.0, -3.0)
	add_child(station)

func _build_hud() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	var panel := PanelContainer.new()
	panel.position = Vector2(18, 18)
	panel.custom_minimum_size = Vector2(270, 82)
	layer.add_child(panel)
	var column := VBoxContainer.new()
	panel.add_child(column)
	var title := Label.new()
	title.text = "NAIJA STAR LIFE 3D  •  TEST BUILD"
	column.add_child(title)
	balance_label = Label.new()
	balance_label.text = "Star Coins: 0  •  Prototype balance"
	column.add_child(balance_label)
	status_label = Label.new()
	status_label.text = "Explore the test area"
	status_label.position = Vector2(18, 112)
	status_label.custom_minimum_size = Vector2(340, 44)
	layer.add_child(status_label)
	interact_button = Button.new()
	interact_button.text = "INTERACT"
	interact_button.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	interact_button.position = Vector2(18, -92)
	interact_button.custom_minimum_size = Vector2(150, 58)
	interact_button.visible = false
	interact_button.pressed.connect(_on_interact_pressed)
	layer.add_child(interact_button)

func _on_prompt_changed(prompt: String) -> void:
	status_label.text = prompt
	interact_button.visible = not prompt.is_empty()

func _on_interact_pressed() -> void:
	if current_player and current_player.has_method("try_interact"):
		current_player.try_interact()

func _on_activity_completed(message: String, reward: int) -> void:
	demo_star_coins += reward
	balance_label.text = "Star Coins: %d  •  Prototype only" % demo_star_coins
	status_label.text = message

func _build_test_ground() -> void:
	var ground := StaticBody3D.new()
	ground.name = "TemporaryTestGround"
	var mesh_instance := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = Vector3(80.0, 0.5, 80.0)
	mesh_instance.mesh = mesh
	mesh_instance.position.y = -0.25
	var material := StandardMaterial3D.new()
	material.albedo_color = Color(0.20, 0.27, 0.22)
	mesh.material = material
	ground.add_child(mesh_instance)
	var collision := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = mesh.size
	collision.shape = shape
	collision.position.y = -0.25
	ground.add_child(collision)
	add_child(ground)

func _build_lighting() -> void:
	var world_environment := WorldEnvironment.new()
	var environment := Environment.new()
	environment.background_mode = Environment.BG_SKY
	environment.sky = Sky.new()
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	environment.ambient_light_color = Color(0.55, 0.62, 0.72)
	environment.ambient_light_energy = 0.8
	world_environment.environment = environment
	add_child(world_environment)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-48.0, -32.0, 0.0)
	sun.light_energy = 1.1
	add_child(sun)
