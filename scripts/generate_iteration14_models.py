# Project Meiji - Automated Blender 3D Model Generator for Takasebune (Canal Cargo Barge)
# Low-poly (<300 tris) historical Japanese flat-bottom river transport boat
# Run via: & "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/generate_iteration14_models.py

import bpy
import os
import math

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def create_material(name, rgba, roughness=0.8):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    if bsdf:
        if 'Base Color' in bsdf.inputs:
            bsdf.inputs['Base Color'].default_value = rgba
        if 'Roughness' in bsdf.inputs:
            bsdf.inputs['Roughness'].default_value = roughness
    return mat

def get_materials():
    return {
        'hull_wood': create_material('M_HullWood', (0.35, 0.24, 0.16, 1.0), 0.85),
        'deck_wood': create_material('M_DeckWood', (0.50, 0.38, 0.25, 1.0), 0.80),
        'dark_cedar': create_material('M_DarkCedar', (0.22, 0.16, 0.12, 1.0), 0.90),
        'bamboo': create_material('M_Bamboo', (0.68, 0.58, 0.38, 1.0), 0.70),
        'straw_sack': create_material('M_StrawSack', (0.62, 0.52, 0.34, 1.0), 0.95),
        'indigo_cloth': create_material('M_IndigoCloth', (0.14, 0.22, 0.38, 1.0), 0.85),
        'sedge_hat': create_material('M_SedgeHat', (0.75, 0.65, 0.45, 1.0), 0.80),
        'barrel_wood': create_material('M_BarrelWood', (0.38, 0.26, 0.18, 1.0), 0.80),
        'black_iron': create_material('M_BlackIron', (0.12, 0.12, 0.14, 1.0), 0.50),
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

def add_cone(name, radius1, depth, location, rotation=(0, 0, 0), vertices=6, material=None):
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

def build_cargo_barge(output_path):
    reset_scene()
    mats = get_materials()

    # Barge dimensions (Tile size = 2.0, Bridge deck arch peak = 0.18, Canal water = 0.038)
    # The barge origin (0, 0, 0) rests at water surface level (y = 0.04 in Three.js world)
    # Total length: ~1.20, width: ~0.42, height: under 0.14 to clear bridges smoothly.

    # 1. Main Flat Hull Bottom & Planking
    add_cube('Hull_Bottom', (0.38, 0.82, 0.03), (0, 0, 0.015), material=mats['hull_wood'])

    # 2. Port & Starboard Gunwales (Side Planks)
    add_cube('Gunwale_Left', (0.035, 0.84, 0.06), (-0.19, 0, 0.04), material=mats['dark_cedar'])
    add_cube('Gunwale_Right', (0.035, 0.84, 0.06), (0.19, 0, 0.04), material=mats['dark_cedar'])

    # 3. Slanted Bow (Front at +Y) - slightly raised prow
    add_cube('Bow_Deck', (0.34, 0.24, 0.035), (0, 0.48, 0.035), rotation=(-0.15, 0, 0), material=mats['hull_wood'])
    add_cube('Bow_StemPost', (0.05, 0.05, 0.07), (0, 0.58, 0.06), material=mats['dark_cedar'])

    # 4. Transom Stern (Rear at -Y)
    add_cube('Stern_Transom', (0.38, 0.04, 0.06), (0, -0.42, 0.04), material=mats['dark_cedar'])
    add_cube('Stern_Deck', (0.34, 0.20, 0.03), (0, -0.32, 0.035), material=mats['deck_wood'])

    # 5. Cargo Section (Midship)
    # Cargo Barrels (Wooden soy/sake barrels)
    add_cylinder('Barrel_1', 0.065, 0.08, (-0.09, -0.06, 0.065), vertices=8, material=mats['barrel_wood'])
    add_cylinder('Barrel_2', 0.065, 0.08, (0.09, -0.06, 0.065), vertices=8, material=mats['barrel_wood'])

    # Woven Straw Rice Sacks (Kome-dawara) stacked horizontally
    add_cylinder('RiceSack_1', 0.05, 0.22, (0, 0.12, 0.05), rotation=(0, math.pi / 2, 0), vertices=6, material=mats['straw_sack'])
    add_cylinder('RiceSack_2', 0.05, 0.20, (-0.05, 0.22, 0.05), rotation=(0, math.pi / 2, 0), vertices=6, material=mats['straw_sack'])
    add_cylinder('RiceSack_3', 0.045, 0.18, (0.02, 0.16, 0.09), rotation=(0, math.pi / 2, 0), vertices=6, material=mats['straw_sack'])

    # 6. Standing Boatman (Sendō) at Stern
    # Indigo tunic torso
    add_cube('Boatman_Body', (0.09, 0.07, 0.075), (0, -0.34, 0.08), material=mats['indigo_cloth'])
    # Head & Sedge Hat (Sugegasa) - conical straw hat
    add_cone('Boatman_Hat', 0.075, 0.03, (0, -0.34, 0.13), vertices=8, material=mats['sedge_hat'])

    # Bamboo Push-Pole (Sao) held along side, dipping back towards water
    add_cylinder('Pole_Sao', 0.012, 0.44, (0.12, -0.38, 0.08), rotation=(math.pi / 5, 0, -0.1), vertices=5, material=mats['bamboo'])

    bpy.ops.export_scene.gltf(filepath=output_path, export_format='GLB')
    print(f"[Blender] Exported Takasebune Barge to {output_path}")

def main():
    target_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'models'))
    os.makedirs(target_dir, exist_ok=True)
    barge_path = os.path.join(target_dir, 'vehicle_barge.glb')
    build_cargo_barge(barge_path)

if __name__ == '__main__':
    main()
