# Project Meiji - Automated Blender 3D Model Generator for Iteration 23
# Low-poly (<500 tris each) assets for:
# 1. commercial_tier3_brick.glb (Two-story Georgian red brick merchant house with arched windows & timber roof)
# 2. civic_telegraph.glb (1x1 brick/wood Telegraph Office with rooftop antenna mast & porcelain insulators)
# Run via: & "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/generate_iteration20_models.py

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
        'red_brick': create_material('M_RedBrick', (0.55, 0.20, 0.15, 1.0), 0.88),
        'stone_trim': create_material('M_StoneTrim', (0.75, 0.72, 0.68, 1.0), 0.70),
        'dark_timber': create_material('M_DarkTimber', (0.24, 0.17, 0.12, 1.0), 0.85),
        'kawara_roof': create_material('M_KawaraRoof', (0.16, 0.18, 0.20, 1.0), 0.60),
        'glass': create_material('M_WindowGlass', (0.45, 0.60, 0.70, 1.0), 0.15, 0.40),
        'black_iron': create_material('M_BlackIron', (0.12, 0.12, 0.14, 1.0), 0.45, 0.80),
        'white_porcelain': create_material('M_Porcelain', (0.92, 0.90, 0.88, 1.0), 0.20),
        'brass': create_material('M_Brass', (0.78, 0.62, 0.20, 1.0), 0.35, 0.75),
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

# 1. Western Brick Arcade (Ginza Rengagai)
# Two-story Georgian-influenced red brick merchant house with arched windows & timber roof
def build_ginza_brick_commercial(output_path):
    reset_scene()
    mats = get_materials()

    # Base granite plinth
    add_cube('Plinth', (1.64, 1.64, 0.14), (0, 0, 0.07), material=mats['stone_trim'])

    # Ground floor brick arcade wall
    add_cube('GroundFloor', (1.56, 1.56, 1.05), (0, 0, 0.665), material=mats['red_brick'])

    # Horizontal stone cornice between floors
    add_cube('Cornice', (1.62, 1.62, 0.10), (0, 0, 1.24), material=mats['stone_trim'])

    # Second floor brick wall
    add_cube('SecondFloor', (1.48, 1.48, 0.95), (0, 0, 1.765), material=mats['red_brick'])

    # Upper parapet / balustrade trim
    add_cube('Parapet', (1.54, 1.54, 0.12), (0, 0, 2.30), material=mats['stone_trim'])

    # Arched merchant windows on ground floor
    for ox in [-0.34, 0.34]:
        add_cube(f'GF_Arch_{ox}', (0.32, 0.08, 0.58), (ox, -0.79, 0.66), material=mats['stone_trim'])
        add_cube(f'GF_Glass_{ox}', (0.26, 0.06, 0.48), (ox, -0.80, 0.66), material=mats['glass'])

    # Arched windows on second floor
    for ox in [-0.34, 0.34]:
        add_cube(f'SF_Arch_{ox}', (0.28, 0.08, 0.50), (ox, -0.75, 1.76), material=mats['stone_trim'])
        add_cube(f'SF_Glass_{ox}', (0.22, 0.06, 0.42), (ox, -0.76, 1.76), material=mats['glass'])

    # Timber hipped roof
    add_cylinder('Roof_Eaves', 1.25, 0.14, (0, 0, 2.42), vertices=4, rotation=(0, 0, math.pi / 4), material=mats['dark_timber'])
    add_cylinder('Roof_Main', 1.05, 0.60, (0, 0, 2.72), vertices=4, rotation=(0, 0, math.pi / 4), material=mats['kawara_roof'])

    bpy.ops.export_scene.gltf(filepath=output_path, export_format='GLB')
    print(f"[Blender] Exported Ginza Brick Arcade to {output_path}")

# 2. Meiji Telegraph Office (Denshin-kyoku)
# 1x1 brick/wood office with rooftop antenna mast & porcelain insulator crossarm
def build_telegraph_office(output_path):
    reset_scene()
    mats = get_materials()

    # Foundation plinth
    add_cube('Plinth', (1.52, 1.52, 0.12), (0, 0, 0.06), material=mats['stone_trim'])

    # Red brick lower office hall
    add_cube('LowerOffice', (1.40, 1.40, 0.85), (0, 0, 0.545), material=mats['red_brick'])

    # Timber dado waistband
    add_cube('Waistband', (1.44, 1.44, 0.08), (0, 0, 0.98), material=mats['dark_timber'])

    # Upper timber paneled story
    add_cube('UpperStory', (1.36, 1.36, 0.55), (0, 0, 1.285), material=mats['dark_timber'])

    # Entrance door & signboard
    add_cube('Door', (0.34, 0.08, 0.65), (0, -0.71, 0.445), material=mats['dark_timber'])
    add_cube('Signboard', (0.42, 0.06, 0.12), (0, -0.72, 0.84), material=mats['black_iron'])

    # Tiled hip roof
    add_cylinder('Roof_Eaves', 1.16, 0.10, (0, 0, 1.61), vertices=4, rotation=(0, 0, math.pi / 4), material=mats['dark_timber'])
    add_cylinder('Roof_Main', 0.95, 0.52, (0, 0, 1.87), vertices=4, rotation=(0, 0, math.pi / 4), material=mats['kawara_roof'])

    # Rooftop antenna mast & insulator crossbar
    add_cylinder('AntennaMast', 0.02, 1.45, (0, 0, 2.65), vertices=6, material=mats['black_iron'])
    add_cube('Crossarm', (0.50, 0.03, 0.03), (0, 0, 3.12), material=mats['black_iron'])

    # Porcelain Gaishi insulators on mast crossarm
    for ox in [-0.20, 0, 0.20]:
        add_cylinder(f'Insulator_{ox}', 0.025, 0.06, (ox, 0, 3.17), vertices=6, material=mats['white_porcelain'])

    bpy.ops.export_scene.gltf(filepath=output_path, export_format='GLB')
    print(f"[Blender] Exported Telegraph Office to {output_path}")

def main():
    target_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'models'))
    os.makedirs(target_dir, exist_ok=True)

    brick_path = os.path.join(target_dir, 'commercial_tier3_brick.glb')
    telegraph_path = os.path.join(target_dir, 'civic_telegraph.glb')

    build_ginza_brick_commercial(brick_path)
    build_telegraph_office(telegraph_path)

if __name__ == '__main__':
    main()
