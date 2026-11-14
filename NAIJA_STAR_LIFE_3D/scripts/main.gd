extends Node3D

const PLAYER_SCENE: PackedScene = preload("res://scenes/player.tscn")

func _ready() -> void:
	# Temporary greybox only; final art will be authored or licensed.
	_build_test_ground()
	_build_lighting()
	var player := PLAYER_SCENE.instantiate()
	player.position = Vector3(0.0, 1.0, 4.0)
	add_child(player)

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
