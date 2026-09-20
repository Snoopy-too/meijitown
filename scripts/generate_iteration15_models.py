# Project Meiji - Automated Blender 3D Model Generator for Iteration 15
# Low-poly (<500 tris each) assets for:
# 1. crossing_wood.glb (Road-rail level crossing with wooden planks & striped warning posts)
# 2. vehicle_train.glb (British 2-4-0 tank locomotive + wooden passenger coach)
# 3. industrial_l2_mill.glb (Meiji red-brick silk reeling / cotton mill with tall chimney)
# Run via: & "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/generate_iteration15_models.py

import bpy
import os
import math

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def create_material(name, rgba, roughness=0.8, metalness=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    if bsdf:
        if 'Base Color' in bsdf.inputs:
            bsdf.inputs['Base Color'].default_value = rgba
        if 'Roughness' in bsdf.inputs:
            bsdf.inputs['Roughness'].default_value = roughness
        if 'Metallic' in bsdf.inputs:
            bsdf.inputs['Metallic'].default_value = metalness
    return mat

def get_materials():
    return {
        'dark_iron': create_material('M_DarkIron', (0.12, 0.12, 0.14, 1.0), 0.45, 0.70),
        'brass': create_material('M_Brass', (0.80, 0.65, 0.22, 1.0), 0.35, 0.85),
        'timber_dark': create_material('M_TimberDark', (0.28, 0.19, 0.13, 1.0), 0.85),
        'timber_light': create_material('M_TimberLight', (0.52, 0.38, 0.24, 1.0), 0.80),
        'warning_yellow': create_material('M_WarningYellow', (0.92, 0.75, 0.10, 1.0), 0.50),
        'warning_black': create_material('M_WarningBlack', (0.08, 0.08, 0.08, 1.0), 0.60),
        'red_brick': create_material('M_RedBrick', (0.58, 0.22, 0.16, 1.0), 0.90),
        'granite_base': create_material('M_Granite', (0.50, 0.48, 0.45, 1.0), 0.85),
        'corrugated_roof': create_material('M_RoofGrey', (0.24, 0.26, 0.28, 1.0), 0.65),
        'glass_window': create_material('M_WindowGlass', (0.65, 0.78, 0.85, 1.0), 0.20, 0.30),
        'white_trim': create_material('M_WhiteTrim', (0.88, 0.86, 0.82, 1.0), 0.70),
        'coach_green': create_material('M_CoachGreen', (0.15, 0.28, 0.20, 1.0), 0.60),
    }

def add_cube(name, size, location, rotation=(0, 0, 0), material=None):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if material:
        obj.data.materials.append(material)
    return obj

def add_cylinder(name, radius, depth, location, rotation=(0, 0, 0), vertices=8, material=None):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=location,
        rotation=rotation
    )
    obj = bpy.context.active_object
    obj.name = name
    if material:
        obj.data.materials.append(material)
    return obj

def export_glb(output_path):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format='GLB',
        use_selection=False,
        export_apply=True
    )
    print(f"Exported: {output_path} ({os.path.getsize(output_path)} bytes)")

# -----------------------------------------------------------------------------
# 1. Wooden Level Crossing (crossing_wood.glb)
# Tile size 2.0. Inlaid planks between and outside rails, plus 2 warning posts
# -----------------------------------------------------------------------------
def build_level_crossing(output_path):
    reset_scene()
    mats = get_materials()

    # Track runs along Y axis (North-South), road runs along X axis (East-West)
    # Rail gauge is 0.44 (rails at x = -0.22 and +0.22)
    # Center inlaid wooden decking between rails
    add_cube('Center_Decking', (0.36, 1.10, 0.04), (0, 0, 0.05), material=mats['timber_light'])

    # Outer wooden ramp planks (Left and Right outside rails)
    add_cube('Outer_Plank_Left', (0.28, 1.10, 0.035), (-0.38, 0, 0.045), material=mats['timber_dark'])
    add_cube('Outer_Plank_Right', (0.28, 1.10, 0.035), (0.38, 0, 0.045), material=mats['timber_dark'])

    # Guard timbers flanking the road crossing edge
    add_cube('Edge_Timber_N', (1.10, 0.06, 0.04), (0, 0.58, 0.045), material=mats['timber_dark'])
    add_cube('Edge_Timber_S', (1.10, 0.06, 0.04), (0, -0.58, 0.045), material=mats['timber_dark'])

    # 2 Warning Posts (Fumikiri crossing posts) at diagonal corners
    posts = [
        (0.60, 0.65, 0),
        (-0.60, -0.65, math.pi)
    ]
    for idx, (px, py, prot) in enumerate(posts):
        add_cylinder(f'Post_Pole_{idx}', 0.025, 0.90, (px, py, 0.45), vertices=6, material=mats['timber_dark'])
        add_cube(f'Crossbuck_A_{idx}', (0.32, 0.04, 0.015), (px, py, 0.82), rotation=(0, 0, 0.70 + prot), material=mats['warning_yellow'])
        add_cube(f'Crossbuck_B_{idx}', (0.32, 0.04, 0.015), (px, py, 0.82), rotation=(0, 0, -0.70 + prot), material=mats['warning_black'])
        add_cube(f'Crossbuck_Center_{idx}', (0.06, 0.06, 0.02), (px, py, 0.82), material=mats['warning_yellow'])

    export_glb(output_path)

# -----------------------------------------------------------------------------
# 2. 1870s Steam Locomotive + Passenger Coach (vehicle_train.glb)
# British-style 2-4-0 tank locomotive + 4-wheel wooden passenger car
# Length ~ 1.8, Width ~ 0.42, Height ~ 0.55
# -----------------------------------------------------------------------------
def build_steam_train(output_path):
    reset_scene()
    mats = get_materials()

    loco_y = 0.45

    # Main Locomotive Frame / Chassis
    add_cube('Loco_Frame', (0.38, 0.85, 0.05), (0, loco_y, 0.10), material=mats['dark_iron'])

    # Cylindrical Boiler
    add_cylinder('Loco_Boiler', 0.14, 0.52, (0, loco_y + 0.12, 0.24), rotation=(math.pi / 2, 0, 0), vertices=8, material=mats['dark_iron'])

    # Smokebox Door
    add_cylinder('Loco_Smokebox', 0.135, 0.04, (0, loco_y + 0.40, 0.24), rotation=(math.pi / 2, 0, 0), vertices=8, material=mats['dark_iron'])

    # Tall Smokestack (Chimney) at front
    add_cylinder('Loco_Stack', 0.045, 0.22, (0, loco_y + 0.30, 0.45), vertices=8, material=mats['dark_iron'])
    add_cylinder('Loco_Stack_Rim', 0.06, 0.03, (0, loco_y + 0.30, 0.56), vertices=8, material=mats['brass'])

    # Brass Steam Dome atop boiler
    add_cylinder('Loco_Dome', 0.05, 0.10, (0, loco_y + 0.10, 0.42), vertices=8, material=mats['brass'])

    # Enclosed Driver Cab at rear of boiler
    add_cube('Loco_Cab_Base', (0.36, 0.28, 0.24), (0, loco_y - 0.22, 0.25), material=mats['dark_iron'])
    add_cube('Loco_Cab_Roof', (0.38, 0.32, 0.03), (0, loco_y - 0.22, 0.38), material=mats['dark_iron'])

    # Side Water Tanks
    add_cube('Loco_Tank_L', (0.06, 0.44, 0.16), (-0.16, loco_y + 0.06, 0.20), material=mats['dark_iron'])
    add_cube('Loco_Tank_R', (0.06, 0.44, 0.16), (0.16, loco_y + 0.06, 0.20), material=mats['dark_iron'])

    # Wheels (2 leading wheels + 4 coupled driving wheels)
    wheel_xs = [-0.19, 0.19]
    for x in wheel_xs:
        add_cylinder(f'Wheel_Lead_{x}', 0.06, 0.03, (x, loco_y + 0.32, 0.06), rotation=(0, 0, math.pi / 2), vertices=8, material=mats['dark_iron'])
        add_cylinder(f'Wheel_Driver1_{x}', 0.09, 0.03, (x, loco_y + 0.08, 0.09), rotation=(0, 0, math.pi / 2), vertices=8, material=mats['dark_iron'])
        add_cylinder(f'Wheel_Driver2_{x}', 0.09, 0.03, (x, loco_y - 0.16, 0.09), rotation=(0, 0, math.pi / 2), vertices=8, material=mats['dark_iron'])

    # Coupling Link
    add_cube('Coupler', (0.04, 0.16, 0.02), (0, 0, 0.08), material=mats['dark_iron'])

    # Passenger Car / Coach
    coach_y = -0.45
    add_cube('Coach_Chassis', (0.36, 0.65, 0.04), (0, coach_y, 0.09), material=mats['dark_iron'])
    add_cube('Coach_Body', (0.36, 0.64, 0.24), (0, coach_y, 0.23), material=mats['coach_green'])
    add_cube('Coach_Roof', (0.38, 0.68, 0.03), (0, coach_y, 0.36), material=mats['timber_dark'])

    add_cube('Coach_Windows_L', (0.02, 0.54, 0.07), (-0.185, coach_y, 0.26), material=mats['glass_window'])
    add_cube('Coach_Windows_R', (0.02, 0.54, 0.07), (0.185, coach_y, 0.26), material=mats['glass_window'])

    for x in wheel_xs:
        add_cylinder(f'Coach_Wheel_F_{x}', 0.07, 0.03, (x, coach_y + 0.20, 0.07), rotation=(0, 0, math.pi / 2), vertices=8, material=mats['dark_iron'])
        add_cylinder(f'Coach_Wheel_R_{x}', 0.07, 0.03, (x, coach_y - 0.20, 0.07), rotation=(0, 0, math.pi / 2), vertices=8, material=mats['dark_iron'])

    export_glb(output_path)

# -----------------------------------------------------------------------------
# 3. Modern Meiji Textile Mill / Silk Reeling Factory (industrial_l2_mill.glb)
# Red brick 2-story building with tall smokestack, dormers & factory windows
# -----------------------------------------------------------------------------
def build_textile_mill(output_path):
    reset_scene()
    mats = get_materials()

    add_cube('Found_Base', (1.55, 1.55, 0.10), (0, 0, 0.05), material=mats['granite_base'])
    add_cube('Main_Factory', (1.35, 1.05, 0.80), (-0.05, -0.15, 0.50), material=mats['red_brick'])
    add_cube('Floor_Belt', (1.38, 1.08, 0.04), (-0.05, -0.15, 0.50), material=mats['white_trim'])
    add_cube('Factory_Roof', (1.42, 1.12, 0.18), (-0.05, -0.15, 0.98), material=mats['corrugated_roof'])

    for wx in [-0.48, -0.22, 0.04, 0.30]:
        add_cube(f'Win_Low_{wx}', (0.16, 0.04, 0.18), (wx - 0.05, 0.38, 0.32), material=mats['glass_window'])
        add_cube(f'Win_High_{wx}', (0.16, 0.04, 0.18), (wx - 0.05, 0.38, 0.68), material=mats['glass_window'])

    for wy in [-0.45, -0.15, 0.15]:
        add_cube(f'Win_Side_{wy}', (0.04, 0.16, 0.18), (-0.73, wy, 0.50), material=mats['glass_window'])

    add_cube('Factory_Door', (0.24, 0.04, 0.32), (-0.05, 0.38, 0.22), material=mats['timber_dark'])

    chimney_x = 0.52
    chimney_y = 0.45
    add_cube('Chimney_Base', (0.34, 0.34, 0.40), (chimney_x, chimney_y, 0.25), material=mats['red_brick'])
    add_cylinder('Chimney_Stack', 0.12, 1.50, (chimney_x, chimney_y, 1.15), vertices=8, material=mats['red_brick'])
    add_cylinder('Chimney_Crown', 0.14, 0.08, (chimney_x, chimney_y, 1.88), vertices=8, material=mats['dark_iron'])

    add_cube('Boiler_Annex', (0.32, 0.65, 0.38), (0.52, -0.15, 0.25), material=mats['red_brick'])
    add_cube('Annex_Roof', (0.35, 0.68, 0.04), (0.52, -0.15, 0.45), rotation=(0, 0.15, 0), material=mats['corrugated_roof'])

    export_glb(output_path)

if __name__ == '__main__':
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    models_dir = os.path.join(base_dir, 'public', 'assets', 'models')

    crossing_path = os.path.join(models_dir, 'crossing_wood.glb')
    train_path = os.path.join(models_dir, 'vehicle_train.glb')
    mill_path = os.path.join(models_dir, 'industrial_l2_mill.glb')

    print("--- Generating Iteration 15 3D Models ---")
    build_level_crossing(crossing_path)
    build_steam_train(train_path)
    build_textile_mill(mill_path)
    print("--- Model Generation Complete ---")
