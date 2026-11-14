extends StaticBody3D
class_name StarLifeActivityStation

@export var activity_title: String = "Community clean-up"
@export var reward_amount: int = 25
@export var cooldown_seconds: float = 12.0

var available: bool = true

func interact() -> Dictionary:
	if not available:
		return {"success": false, "message": "This activity is resting. Come back shortly.", "reward": 0}
	available = false
	var timer := get_tree().create_timer(cooldown_seconds)
	timer.timeout.connect(func() -> void: available = true)
	return {
		"success": true,
		"message": "%s completed! You earned %d demo Star Coins." % [activity_title, reward_amount],
		"reward": reward_amount
	}
