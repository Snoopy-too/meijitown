# Project Meiji - Automated Blender 3D Model Generator for Harbor Cargo Pier (Funatsuki-ba / 船着場)
# Low-poly (<500 tris) 2x2 Meiji waterfront wharf and logistics basin:
# Stone embankment wharf, timber decking, mooring pilings, derrick crane, rice bales (tawara), cargo crates.
# Run via: & "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/generate_iteration24_models.py

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
        'stone': create_material('M_StoneWharf', (0.38, 0.36, 0.34, 1.0), roughness=0.9),
        'deck': create_material('M_WoodDeck', (0.36, 0.27, 0.19, 1.0), roughness=0.8),
        'timber': create_material('M_DarkTimber', (0.22, 0.16, 0.11, 1.0), roughness=0.85),
        'iron': create_material('M_IronMetal', (0.15, 0.15, 0.18, 1.0), roughness=0.3, metalness=0.8),
        'straw': create_material('M_RiceStraw', (0.72, 0.61, 0.35, 1.0), roughness=0.9),
        'crate': create_material('M_WoodCrate', (0.45, 0.33, 0.22, 1.0), roughness=0.8),
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

def add_cylinder(name, radius, depth, location, rotation=(0, 0, 0), vertices=6, material=None):
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

def build_harbor_pier(output_path):
    reset_scene()
    m = get_materials()

    # 1. Stone Embankment Foundation (2x2 tile footprint ~3.7m x 3.7m)
    add_cube('Wharf_Stone_Base', (3.70, 3.70, 0.22), (0, 0, 0.11), material=m['stone'])

    # 2. Weathered Timber Wharf Decking
    add_cube('Wharf_Timber_Deck', (3.55, 3.55, 0.06), (0, 0, 0.25), material=m['deck'])

    # 3. Waterfront Mooring Edge (Poles & Iron Bollards)
    pile_x_positions = [-1.50, -0.60, 0.60, 1.50]
    for idx, px in enumerate(pile_x_positions):
        # Heavy timber dock pilings
        add_cylinder(f'Wharf_Pile_{idx}', 0.09, 0.70, (px, 1.82, 0.15), vertices=6, material=m['timber'])
        # Iron mooring bollard caps
        add_cylinder(f'Wharf_Bollard_{idx}', 0.05, 0.28, (px, 1.68, 0.40), vertices=6, material=m['iron'])

    # 4. Manual Cargo Derrick Crane (Port side: x = -1.0, y = 0.9)
    # Turntable base
    add_cylinder('Crane_Base', 0.22, 0.24, (-1.0, 0.9, 0.38), vertices=8, material=m['timber'])
    # Vertical Mast
    add_cylinder('Crane_Mast', 0.07, 2.10, (-1.0, 0.9, 1.35), vertices=6, material=m['timber'])
    # Angled Boom Jib (reaching out over the water edge)
    add_cylinder('Crane_Boom', 0.05, 1.80, (-0.65, 1.35, 2.05), rotation=(-0.65, 0, 0.35), vertices=6, material=m['timber'])
    # Iron Pulley Block & Cable
    add_cylinder('Crane_Cable', 0.015, 1.30, (-0.25, 1.72, 1.60), vertices=4, material=m['iron'])
    add_cube('Crane_Hook', (0.10, 0.10, 0.12), (-0.25, 1.72, 0.92), material=m['iron'])

    # 5. Stacked Rice Straw Bales (Tawara / 俵) (Starboard side: x = 0.7, y = -0.3)
    tawara_positions = [
        (0.60, -0.50, 0.40),
        (0.60, 0.30, 0.40),
        (1.05, -0.10, 0.40),
        (0.85, -0.10, 0.62) # top layer
    ]
    for idx, (tx, ty, tz) in enumerate(tawara_positions):
        add_cylinder(f'Tawara_{idx}', 0.14, 0.55, (tx, ty, tz), rotation=(0, math.pi / 2, 0), vertices=8, material=m['straw'])

    # 6. Wooden Freight Cargo Shipping Crates
    add_cube('Crate_Large_1', (0.60, 0.50, 0.50), (-0.80, -0.70, 0.53), material=m['crate'])
    add_cube('Crate_Small_2', (0.45, 0.40, 0.38), (-1.20, -0.20, 0.47), rotation=(0, 0, 0.25), material=m['crate'])
    add_cube('Crate_Small_3', (0.40, 0.40, 0.35), (-0.75, -0.70, 0.95), rotation=(0, 0, -0.15), material=m['crate'])

    # Export GLB
    bpy.ops.export_scene.gltf(filepath=output_path, export_format='GLB')
    print(f"[Blender] Successfully exported Meiji Harbor Pier to {output_path}")

def main():
    target_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'models'))
    os.makedirs(target_dir, exist_ok=True)
    pier_path = os.path.join(target_dir, 'infrastructure_pier.glb')
    build_harbor_pier(pier_path)

if __name__ == '__main__':
    main()
