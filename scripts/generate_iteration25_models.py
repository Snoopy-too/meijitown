# Project Meiji - Automated Blender 3D Model Generator for Iteration 25
# Generates:
# 1. assets/models/utility_powerplant.glb (2x2 Coal Steam Power Plant: brick turbine hall, iron chimney, dynamos)
# 2. assets/models/monument_pavilion.glb (3x3 National Industrial Exhibition Pavilion: Giyofu palace, cupola, colonnade, banners)
# Run via: & "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/generate_iteration25_models.py

import bpy
import os
import math

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def create_material(name, rgba, roughness=0.7, metalness=0.0):
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
        'brick': create_material('M_RedBrick', (0.55, 0.20, 0.14, 1.0), roughness=0.85),
        'stone': create_material('M_GraniteStone', (0.42, 0.40, 0.38, 1.0), roughness=0.9),
        'iron_roof': create_material('M_CorrugatedIron', (0.28, 0.30, 0.33, 1.0), roughness=0.4, metalness=0.6),
        'chimney': create_material('M_BlackIron', (0.12, 0.12, 0.14, 1.0), roughness=0.3, metalness=0.8),
        'dynamo': create_material('M_CopperIron', (0.35, 0.22, 0.15, 1.0), roughness=0.4, metalness=0.7),
        'cream_plaster': create_material('M_CreamPlaster', (0.88, 0.86, 0.80, 1.0), roughness=0.8),
        'giyofu_blue': create_material('M_GiyofuBlueRoof', (0.20, 0.28, 0.36, 1.0), roughness=0.6),
        'gold': create_material('M_ImperialGold', (0.82, 0.68, 0.22, 1.0), roughness=0.3, metalness=0.85),
        'banner_red': create_material('M_BannerRed', (0.75, 0.12, 0.12, 1.0), roughness=0.85),
    }

def add_cube(name, size, location, rotation=(0, 0, 0), material=None):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(scale=True, rotation=True)
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

def add_cone(name, radius1, depth, location, rotation=(0, 0, 0), vertices=8, material=None):
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius1,
        depth=depth,
        location=location,
        rotation=rotation
    )
    obj = bpy.context.active_object
    obj.name = name
    if material:
        obj.data.materials.append(material)
    return obj

# -------------------------------------------------------------
# 1. 2x2 Coal Steam Power Plant (assets/models/utility_powerplant.glb)
# -------------------------------------------------------------
def build_powerplant(output_path):
    reset_scene()
    m = get_materials()

    # Stone Foundation
    add_cube('Plant_Base', (3.70, 3.70, 0.18), (0, 0, 0.09), material=m['stone'])

    # Main Red-Brick Turbine Hall (x: -0.4, y: 0)
    add_cube('Plant_Turbine_Hall', (2.20, 2.80, 1.60), (-0.40, 0.0, 0.98), material=m['brick'])

    # Corrugated Gable Roof
    add_cube('Plant_Gable_Roof', (2.35, 2.90, 0.22), (-0.40, 0.0, 1.82), material=m['iron_roof'])

    # Industrial Boiler Smoke Stack (Heavy iron chimney with reinforcement rings)
    add_cylinder('Plant_Chimney_Base', 0.35, 0.60, (1.10, 0.85, 0.48), vertices=8, material=m['brick'])
    add_cylinder('Plant_Chimney_Shaft', 0.24, 3.40, (1.10, 0.85, 2.28), vertices=8, material=m['chimney'])
    add_cylinder('Plant_Chimney_Cap', 0.30, 0.14, (1.10, 0.85, 4.02), vertices=8, material=m['chimney'])

    # Exterior Transformer Dynamos & Generator Housing (East wing)
    add_cube('Plant_Transformer_Beds', (0.90, 1.50, 0.45), (1.05, -0.65, 0.40), material=m['stone'])
    add_cylinder('Plant_Dynamo_1', 0.25, 0.70, (1.05, -0.35, 0.75), rotation=(math.pi / 2, 0, 0), vertices=8, material=m['dynamo'])
    add_cylinder('Plant_Dynamo_2', 0.25, 0.70, (1.05, -0.95, 0.75), rotation=(math.pi / 2, 0, 0), vertices=8, material=m['dynamo'])

    # Transformer Catenary Insulator Bushings
    add_cylinder('Plant_Bushing_1', 0.05, 0.35, (1.05, -0.35, 1.22), vertices=6, material=m['chimney'])
    add_cylinder('Plant_Bushing_2', 0.05, 0.35, (1.05, -0.95, 1.22), vertices=6, material=m['chimney'])

    bpy.ops.export_scene.gltf(filepath=output_path, export_format='GLB')
    print(f"[Blender] Successfully exported Coal Steam Power Plant to {output_path}")

# -------------------------------------------------------------
# 2. 3x3 National Industrial Exhibition Pavilion (assets/models/monument_pavilion.glb)
# -------------------------------------------------------------
def build_monument_pavilion(output_path):
    reset_scene()
    m = get_materials()

    # Grand 3x3 Stone Plinth Podium (5.6m x 5.6m)
    add_cube('Pavilion_Podium', (5.60, 5.60, 0.25), (0, 0, 0.125), material=m['stone'])
    add_cube('Pavilion_Stairs_Terrace', (5.30, 5.30, 0.18), (0, 0, 0.32), material=m['stone'])

    # Grand Giyōfū 2-Story Exhibition Palace Hall
    add_cube('Pavilion_Main_Hall', (4.40, 4.00, 1.50), (0, -0.15, 1.15), material=m['cream_plaster'])
    add_cube('Pavilion_Cornice', (4.60, 4.20, 0.16), (0, -0.15, 1.95), material=m['stone'])
    add_cube('Pavilion_Second_Tier', (3.40, 3.20, 1.10), (0, -0.15, 2.55), material=m['cream_plaster'])

    # Classical Entrance Colonnade (6 Greco-Western Tuscan Pillars along front)
    col_x = [-1.8, -1.1, -0.4, 0.4, 1.1, 1.8]
    for idx, cx in enumerate(col_x):
        add_cylinder(f'Pavilion_Pillar_{idx}', 0.09, 1.45, (cx, 2.05, 1.10), vertices=8, material=m['cream_plaster'])

    # Front Portico Entablature
    add_cube('Pavilion_Portico_Entablature', (4.20, 0.50, 0.22), (0, 2.05, 1.92), material=m['stone'])
    # Classical Triangular Pediment
    add_cone('Pavilion_Pediment', 1.80, 0.65, (0, 2.05, 2.35), rotation=(0, 0, math.pi / 4), vertices=4, material=m['cream_plaster'])

    # Central Grand Giyōfū Octagonal Cupola Dome
    add_cylinder('Pavilion_Cupola_Drum', 0.85, 0.70, (0, -0.15, 3.45), vertices=8, material=m['cream_plaster'])
    add_cone('Pavilion_Dome_Roof', 1.05, 1.10, (0, -0.15, 4.35), vertices=8, material=m['giyofu_blue'])
    add_cylinder('Pavilion_Finial_Spire', 0.04, 0.75, (0, -0.15, 5.25), vertices=6, material=m['gold'])
    add_cylinder('Pavilion_Finial_Sphere', 0.12, 0.18, (0, -0.15, 5.65), vertices=6, material=m['gold'])

    # Celebratory Exposition Banners (Hakurankai / 博覧会)
    banner_x = [-2.1, 2.1]
    for idx, bx in enumerate(banner_x):
        add_cylinder(f'Pavilion_Flagpole_{idx}', 0.03, 2.80, (bx, 2.10, 2.50), vertices=6, material=m['chimney'])
        add_cube(f'Pavilion_Banner_{idx}', (0.12, 0.60, 1.20), (bx, 2.35, 3.10), material=m['banner_red'])

    bpy.ops.export_scene.gltf(filepath=output_path, export_format='GLB')
    print(f"[Blender] Successfully exported Exhibition Pavilion to {output_path}")

def main():
    target_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'models'))
    os.makedirs(target_dir, exist_ok=True)
    plant_path = os.path.join(target_dir, 'utility_powerplant.glb')
    pavilion_path = os.path.join(target_dir, 'monument_pavilion.glb')
    build_powerplant(plant_path)
    build_monument_pavilion(pavilion_path)

if __name__ == '__main__':
    main()
