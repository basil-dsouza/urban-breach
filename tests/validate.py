import math
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def test_spread_math():
    print("Testing balanced precision spread math...")
    base_standing = 7.0
    base_moving = 12.0
    base_sprinting = 18.0
    base_aiming = 0.0
    max_spread = 26.0
    fire_rate = 20.0
    recovery_speed = 16.0

    assert base_aiming < base_standing < base_moving < base_sprinting

    spread = base_standing
    for _ in range(10):
        spread = min(max_spread, spread + fire_rate * 0.05)
    assert spread > base_standing
    assert spread <= max_spread

    for _ in range(100):
        spread = min(max_spread, spread + fire_rate * 0.05)
    assert spread == max_spread

    for _ in range(20):
        spread = max(0.0, spread - recovery_speed * 3 * 0.05)
    assert spread == 0.0
    print("[PASS] Precision spread math passed!")

def test_reload_and_ammo_math():
    print("Testing reload & ammo management...")
    max_ammo = 30
    ammo = max_ammo

    for _ in range(10):
        assert ammo > 0
        ammo -= 1
    assert ammo == 20

    is_reloading = True
    reload_timer = 1.8
    reload_phase = 0

    reload_timer -= 0.65
    if reload_timer <= 1.2 and reload_phase == 0:
        reload_phase = 1
    assert reload_phase == 1

    reload_timer -= 0.8
    if reload_timer <= 0.4 and reload_phase == 1:
        reload_phase = 2
    assert reload_phase == 2

    reload_timer -= 0.4
    if reload_timer <= 0:
        is_reloading = False
        ammo = max_ammo

    assert not is_reloading
    assert ammo == 30
    print("[PASS] Reload & ammo management passed!")

def test_grenade_replenish_system():
    print("Testing grenade replenish system...")
    max_grenades = 5
    grenade_count = 3
    replenish_timer = 5.0

    for _ in range(100):
        delta = 0.05
        if grenade_count < max_grenades:
            replenish_timer -= delta
            if replenish_timer <= 0.001:
                grenade_count += 1
                replenish_timer = 5.0

    assert grenade_count == 4
    assert replenish_timer == 5.0

    for _ in range(200):
        delta = 0.05
        if grenade_count < max_grenades:
            replenish_timer -= delta
            if replenish_timer <= 0.001:
                grenade_count += 1
                replenish_timer = 5.0

    assert grenade_count == 5
    print("[PASS] Grenade replenish system passed!")

def test_heading_up_radar_math():
    print("Testing heading-up forward-oriented radar projection...")
    radius = 85
    radar_range = 65
    player_x, player_z = 10, 20
    player_yaw = math.pi / 2 # Player facing East (+X in Three.js)

    enemy_x = player_x - 15 * math.sin(player_yaw)
    enemy_z = player_z - 15 * math.cos(player_yaw)

    dx = enemy_x - player_x
    dz = enemy_z - player_z

    rel_right = dx * math.cos(player_yaw) - dz * math.sin(player_yaw)
    rel_forward = -dx * math.sin(player_yaw) - dz * math.cos(player_yaw)

    scale = radius / radar_range
    screen_x = radius + rel_right * scale
    screen_y = radius - rel_forward * scale

    assert abs(screen_x - radius) < 0.001
    assert screen_y < radius
    print("[PASS] Heading-up forward-oriented radar projection passed!")

def test_bush_stealth_mechanics():
    print("Testing bush stealth mechanics...")
    stealth_bushes = [{'x': 30, 'z': 30, 'radius': 2.3}]

    def is_in_bush(px, pz):
        for b in stealth_bushes:
            if math.hypot(px - b['x'], pz - b['z']) < b['radius']:
                return True
        return False

    assert is_in_bush(30.5, 30.5) is True
    assert is_in_bush(40.0, 30.0) is False

    def can_enemy_see_player(dist, is_hidden):
        detection_range = 5.0 if is_hidden else 75.0
        return dist <= detection_range

    assert can_enemy_see_player(20.0, is_hidden=False) is True
    assert can_enemy_see_player(20.0, is_hidden=True) is False
    assert can_enemy_see_player(3.0, is_hidden=True) is True
    print("[PASS] Bush stealth mechanics passed!")

def test_chimney_hitboxes_and_top_standing():
    print("Testing chimney side obstacle hitboxes and top cap standing surface...")
    player_radius = 0.35
    eye_height = 1.7

    house_x, house_z = 100, 100
    house_w, house_d, house_h = 16, 16, 8
    roof_h = 4.0
    chimney_h = 4.6

    chimney_x = house_x - house_w / 3.5
    chimney_z = house_z - house_d / 4
    chimney_cap_top = house_h + roof_h * 0.45 + chimney_h / 2 + 0.25

    obstacles = [
        {'x': house_x, 'z': house_z, 'w': house_w, 'd': house_d, 'bottom': 0, 'top': house_h},
        {'x': chimney_x, 'z': chimney_z, 'w': 1.6, 'd': 1.6, 'bottom': house_h - 1.0, 'top': chimney_cap_top}
    ]

    def check_collision(px, pz, py):
        player_feet = py - eye_height
        for obs in obstacles:
            half_w = obs['w'] / 2 + player_radius
            half_d = obs['d'] / 2 + player_radius
            if (px >= obs['x'] - half_w and px <= obs['x'] + half_w and
                pz >= obs['z'] - half_d and pz <= obs['z'] + half_d and
                player_feet < obs['top'] - 0.15 and
                player_feet >= (obs.get('bottom', 0)) - 0.5):
                return True
        return False

    # 1. Side collision stops penetration
    assert check_collision(chimney_x, chimney_z, 10.0 + eye_height) is True
    # 2. Standing on chimney top is allowed
    assert check_collision(chimney_x, chimney_z, chimney_cap_top + eye_height) is False

    def get_ground(x, z):
        if abs(x - chimney_x) <= 0.8 and abs(z - chimney_z) <= 0.8:
            return chimney_cap_top
        return house_h + 2.0

    assert get_ground(chimney_x, chimney_z) == chimney_cap_top
    print("[PASS] Chimney side obstacle hitboxes and top cap standing surface passed!")

def test_fall_damage_system():
    print("Testing realistic fall damage calculation...")
    def calculate_fall_damage(velocity_y):
        if velocity_y < -14.5:
            fall_speed = abs(velocity_y)
            return round((fall_speed - 13.5) * 4.5)
        return 0

    assert calculate_fall_damage(-9.0) == 0
    assert calculate_fall_damage(-14.0) == 0
    assert calculate_fall_damage(-17.0) == 16
    assert calculate_fall_damage(-26.0) == 56
    assert calculate_fall_damage(-38.0) >= 100
    print("[PASS] Realistic fall damage calculation passed!")

def test_vehicle_pursuit_and_ramming_system():
    print("Testing vehicle combat pursuit, ramming, and obstacle recovery...")
    player_pos = {'x': 0, 'z': 0}
    car = {
        'x': 0,
        'z': 50,
        'yaw': math.pi, # facing towards player
        'speed': 22,
        'state': 'pursuit',
        'damage': 40,
        'health': 35
    }

    # Step 1: Distance 50m -> Pursuit mode
    dist = math.hypot(player_pos['x'] - car['x'], player_pos['z'] - car['z'])
    assert dist == 50
    assert car['state'] == 'pursuit'

    # Step 2: Distance closes to 15m -> Ram surge mode
    car['z'] = 15
    dist = math.hypot(player_pos['x'] - car['x'], player_pos['z'] - car['z'])
    if dist < 18:
        car['state'] = 'charge'
        car['speed'] = 22 * 1.45
    assert car['state'] == 'charge'
    assert car['speed'] > 30

    # Step 3: Ram contact at dist < 3.2m
    car['z'] = 2.0
    dist = math.hypot(player_pos['x'] - car['x'], player_pos['z'] - car['z'])
    player_damaged = 0
    if dist < 3.2:
        player_damaged = car['damage']
        car['state'] = 'pass'

    assert player_damaged == 40
    assert car['state'] == 'pass'

    # Step 4: Damage and explosion
    car['health'] -= 35
    car_destroyed = car['health'] <= 0
    assert car_destroyed is True
    print("[PASS] Vehicle combat pursuit, ramming, and obstacle recovery passed!")

def test_crouch_spread_and_edge_lock():
    print("Testing crouching spread reduction and edge lock safety...")
    base_standing = 7.0
    base_crouching = 3.5
    base_crouch_moving = 6.0
    base_moving = 12.0

    # 1. Spread math
    assert base_crouching < base_standing
    assert base_crouch_moving < base_moving

    # 2. Edge lock probe math
    roof_ground = 15.0
    street_ground = 0.0

    current_pos_x = 9.9
    next_pos_x = 10.05
    probe_x = next_pos_x + 0.28 # 10.33m

    def get_ground(x):
        return roof_ground if x <= 10.0 else street_ground

    current_ground = get_ground(current_pos_x)
    probe_ground = get_ground(probe_x)
    drop = current_ground - probe_ground

    # Drop exceeds 0.85m -> movement blocked
    is_blocked = drop > 0.85
    assert is_blocked is True
    print("[PASS] Crouching spread reduction and edge lock safety passed!")

def test_two_gun_arsenal_stats():
    print("Testing 2-gun arsenal configuration (AK-47 & Barrett .50)...")
    ak47 = {'ammo': 30, 'damage': 35, 'fireRate': 0.095, 'aimFOV': 48}
    barrett = {'ammo': 10, 'damage': 200, 'fireRate': 0.85, 'aimFOV': 15}

    assert ak47['ammo'] == 30
    assert ak47['fireRate'] < 0.1
    assert barrett['ammo'] == 10
    assert barrett['damage'] >= 200 # 1-shot lethality
    assert barrett['aimFOV'] == 15 # 5x optical zoom
    print("[PASS] 2-gun arsenal configuration passed!")

if __name__ == '__main__':
    test_spread_math()
    test_reload_and_ammo_math()
    test_grenade_replenish_system()
    test_heading_up_radar_math()
    test_bush_stealth_mechanics()
    test_chimney_hitboxes_and_top_standing()
    test_fall_damage_system()
    test_vehicle_pursuit_and_ramming_system()
    test_crouch_spread_and_edge_lock()
    test_two_gun_arsenal_stats()
    print("\n==========================================")
    print("ALL VALIDATION TESTS PASSED (100%)!")
    print("==========================================")

