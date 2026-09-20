# Project Meiji - Automated Blender 3D Model Generator for Primary School (Shōgakkō / 小学校)
# Low-poly (<500 tris) 2x2 early Meiji schoolhouse:
# Traditional wooden construction, Western-style glass sash windows, entrance porch, and central bell cupola
# Run via: & "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/generate_school.py

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
        'stone': create_material('M_StoneFoundation', (0.42, 0.40, 0.38, 1.0), 0.9),
        'wood': create_material('M_TimberCladding', (0.35, 0.25, 0.17, 1.0), 0.8),
        'dark_wood': create_material('M_DarkPillars', (0.22, 0.16, 0.11, 1.0), 0.85),
        'plaster': create_material('M_WhitePlaster', (0.88, 0.86, 0.82, 1.0), 0.75),
        'roof': create_material('M_KawaraRoof', (0.18, 0.20, 0.22, 1.0), 0.6),
        'glass': create_material('M_GlassSash', (0.55, 0.70, 0.80, 1.0), 0.2),
        'bell_bronze': create_material('M_BellBronze', (0.75, 0.58, 0.25, 1.0), 0.35),
    }

def add_cube(name, size, location, material=None):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location)
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

def build_civic_school(output_path):
    reset_scene()
    m = get_materials()

    # Total 2x2 building dimensions: ~3.2m x 2.8m (footprint fits inside 4.0m x 4.0m)
    # 1. Stone Foundation Plinth
    add_cube('School_Base', (3.30, 2.70, 0.18), (0, 0, 0.09), material=m['stone'])

    # 2. Main 2-Story Schoolhouse Body (Timber Cladding with White Plaster upper bands)
    add_cube('School_Lower_Body', (3.10, 2.50, 0.90), (0, 0, 0.63), material=m['wood'])
    add_cube('School_Upper_Body', (3.04, 2.44, 0.85), (0, 0, 1.505), material=m['plaster'])

    # 3. Horizontal Timber Trim between floors and eaves
    add_cube('Trim_Mid', (3.14, 2.54, 0.08), (0, 0, 1.08), material=m['dark_wood'])
    add_cube('Trim_Eave', (3.12, 2.52, 0.08), (0, 0, 1.93), material=m['dark_wood'])

    # 4. Western-Style Sash Windows (Transitional Giyōfū Glass Panes)
    # Front Windows (Lower & Upper)
    window_x_offsets = [-1.0, -0.4, 0.4, 1.0]
    for idx, wx in enumerate(window_x_offsets):
        # Lower windows
        add_cube(f'Window_L_Frame_{idx}', (0.34, 0.08, 0.52), (wx, -1.27, 0.66), material=m['dark_wood'])
        add_cube(f'Window_L_Glass_{idx}', (0.28, 0.06, 0.46), (wx, -1.28, 0.66), material=m['glass'])
        # Upper windows
        add_cube(f'Window_U_Frame_{idx}', (0.34, 0.08, 0.52), (wx, -1.24, 1.52), material=m['dark_wood'])
        add_cube(f'Window_U_Glass_{idx}', (0.28, 0.06, 0.46), (wx, -1.25, 1.52), material=m['glass'])

    # 5. Entrance Porch (Center front: x=0, y=-1.35)
    # Porch Stone Step
    add_cube('Porch_Step', (0.90, 0.45, 0.12), (0, -1.45, 0.06), material=m['stone'])
    # Porch Timber Columns
    add_cube('Porch_Col_L', (0.08, 0.08, 0.95), (-0.38, -1.55, 0.55), material=m['dark_wood'])
    add_cube('Porch_Col_R', (0.08, 0.08, 0.95), (0.38, -1.55, 0.55), material=m['dark_wood'])
    # Porch Gabled Awning Roof
    add_cube('Porch_Roof_Base', (0.96, 0.52, 0.08), (0, -1.52, 1.04), material=m['dark_wood'])
    add_cube('Porch_Roof_Slope', (0.92, 0.48, 0.14), (0, -1.50, 1.13), material=m['roof'])

    # 6. Main Hipped-Gable Roof (Kawara Tiles)
    # Lower Eaves Overhang
    add_cube('Main_Roof_Eaves', (3.46, 2.86, 0.12), (0, 0, 1.99), material=m['roof'])
    # Hi-pitched Central Roof Body
    add_cube('Main_Roof_Peak', (2.70, 2.10, 0.55), (0, 0, 2.30), material=m['roof'])
    # Ridge Cap (Mune)
    add_cube('Main_Roof_Ridge', (2.40, 0.14, 0.12), (0, 0, 2.62), material=m['roof'])

    # 7. Central Bell Tower / Clock Cupola (Western Early Meiji Feature)
    # Cupola Square Plinth / Base
    add_cube('Cupola_Base', (0.64, 0.64, 0.35), (0, 0, 2.76), material=m['plaster'])
    add_cube('Cupola_Trim', (0.68, 0.68, 0.06), (0, 0, 2.94), material=m['dark_wood'])
    # 4 Corner Pillars
    cupola_col_pos = [(-0.25, -0.25), (0.25, -0.25), (-0.25, 0.25), (0.25, 0.25)]
    for idx, (cx, cy) in enumerate(cupola_col_pos):
        add_cube(f'Cupola_Col_{idx}', (0.06, 0.06, 0.42), (cx, cy, 3.16), material=m['dark_wood'])
    # Bronze Bell suspended inside
    add_cylinder('School_Bell', 0.12, 0.22, (0, 0, 3.16), vertices=8, material=m['bell_bronze'])
    # Cupola Conical / Pyramid Roof
    add_cylinder('Cupola_Roof', 0.46, 0.32, (0, 0, 3.48), vertices=6, material=m['roof'])
    # Cupola Bronze Spire / Finial
    add_cylinder('Cupola_Finial', 0.03, 0.30, (0, 0, 3.75), vertices=4, material=m['bell_bronze'])

    bpy.ops.export_scene.gltf(filepath=output_path, export_format='GLB')
    print(f"[Blender] Successfully exported Meiji Primary School (civic_school.glb) to {output_path}")

def main():
    target_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'models'))
    os.makedirs(target_dir, exist_ok=True)
    school_path = os.path.join(target_dir, 'civic_school.glb')
    build_civic_school(school_path)

if __name__ == '__main__':
    main()
