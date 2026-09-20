# Project Meiji - Automated Blender 3D Model Generator for Kōban (Police Box / 交番)
# Low-poly (<250 tris) Meiji-era municipal sentry box with Akatōchō red lantern
# Run via: & "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/generate_koban.py

import bpy
import os

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
        'wood': create_material('M_Wood', (0.28, 0.20, 0.14, 1.0), 0.85),
        'stone': create_material('M_Stone', (0.38, 0.35, 0.32, 1.0), 0.9),
        'roof': create_material('M_KawaraRoof', (0.16, 0.17, 0.19, 1.0), 0.6),
        'brick': create_material('M_Brick', (0.45, 0.20, 0.16, 1.0), 0.85),
        'bronze': create_material('M_Bronze', (0.65, 0.48, 0.22, 1.0), 0.4),
        'red_lantern': create_material('M_RedLantern', (0.88, 0.18, 0.12, 1.0), 0.4),
        'cedar': create_material('M_DarkCedar', (0.20, 0.15, 0.11, 1.0), 0.85),
        'black_iron': create_material('M_BlackIron', (0.12, 0.12, 0.14, 1.0), 0.6),
    }

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

def add_cube(name, size, location, material=None):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if material:
        obj.data.materials.append(material)
    return obj

def build_civic_koban(output_path):
    reset_scene()
    mats = get_materials()

    # 1. Hexagonal Stone Foundation Plinth
    add_cylinder('Koban_Base', 0.72, 0.12, (0, 0, 0.06), vertices=6, material=mats['stone'])

    # 2. Main Sentry Box Body (Hexagonal Red Brick Sentry Booth)
    add_cylinder('Koban_Body', 0.60, 1.30, (0, 0, 0.77), vertices=6, material=mats['brick'])

    # 3. Timber Dado & Trim Rings
    add_cylinder('Dado_Trim', 0.62, 0.08, (0, 0, 0.22), vertices=6, material=mats['wood'])
    add_cylinder('Eave_Trim', 0.62, 0.08, (0, 0, 1.38), vertices=6, material=mats['wood'])

    # 4. Front Entrance Doorway & Frame
    add_cube('Door_Frame', (0.40, 0.10, 0.90), (0, -0.56, 0.58), material=mats['wood'])
    add_cube('Door_Panel', (0.32, 0.06, 0.82), (0, -0.58, 0.54), material=mats['cedar'])

    # 5. Hexagonal Pagoda / Conical Roof
    add_cylinder('Roof_Eaves', 0.82, 0.12, (0, 0, 1.48), vertices=6, material=mats['roof'])
    add_cylinder('Roof_Pyramid', 0.66, 0.38, (0, 0, 1.68), vertices=6, material=mats['roof'])
    add_cylinder('Roof_Finial', 0.07, 0.22, (0, 0, 1.95), vertices=6, material=mats['bronze'])

    # 6. Hanging Red Globe Lamp (Akatōchō / 赤燈籠 / 赤色灯)
    # Iron bracket cantilevered above the entrance
    add_cube('Lamp_Bracket', (0.04, 0.30, 0.04), (0, -0.68, 1.32), material=mats['black_iron'])
    add_cylinder('Lamp_Cord', 0.012, 0.10, (0, -0.80, 1.26), vertices=4, material=mats['black_iron'])
    # Glowing Red Globe Lantern
    add_cylinder('Lamp_Cap', 0.07, 0.04, (0, -0.80, 1.22), vertices=6, material=mats['black_iron'])
    add_cylinder('Lamp_Globe', 0.09, 0.16, (0, -0.80, 1.12), vertices=8, material=mats['red_lantern'])

    bpy.ops.export_scene.gltf(filepath=output_path, export_format='GLB')
    print(f"[Blender] Exported Meiji Police Box (Kōban) to {output_path}")

def main():
    target_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'models'))
    os.makedirs(target_dir, exist_ok=True)
    koban_path = os.path.join(target_dir, 'civic_koban.glb')
    build_civic_koban(koban_path)

if __name__ == '__main__':
    main()
