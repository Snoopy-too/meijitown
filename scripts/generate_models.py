# Project Meiji - Automated Blender 3D Model Generator
# Generates low-poly (<300 tris) historical Meiji architecture for Level 1 and Level 2.
# Run via: blender.exe --background --python scripts/generate_models.py

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
        'wood': create_material('M_Wood', (0.28, 0.20, 0.14, 1.0), 0.85),
        'light_wood': create_material('M_LightWood', (0.55, 0.42, 0.28, 1.0), 0.8),
        'plaster': create_material('M_Plaster', (0.88, 0.86, 0.82, 1.0), 0.9),
        'black_plaster': create_material('M_BlackPlaster', (0.12, 0.12, 0.14, 1.0), 0.75),
        'roof': create_material('M_KawaraRoof', (0.16, 0.17, 0.19, 1.0), 0.6),
        'stone': create_material('M_Stone', (0.38, 0.35, 0.32, 1.0), 0.9),
        'noren': create_material('M_Noren', (0.12, 0.22, 0.36, 1.0), 0.7),
        'bamboo': create_material('M_Bamboo', (0.62, 0.54, 0.36, 1.0), 0.8),
        'matting': create_material('M_Matting', (0.52, 0.46, 0.34, 1.0), 0.95),
        'brick': create_material('M_Brick', (0.45, 0.20, 0.16, 1.0), 0.85),
        'bronze': create_material('M_Bronze', (0.65, 0.48, 0.22, 1.0), 0.4),
        'red_lantern': create_material('M_RedLantern', (0.88, 0.18, 0.12, 1.0), 0.4),
        'cedar': create_material('M_DarkCedar', (0.20, 0.15, 0.11, 1.0), 0.85),
        'screen': create_material('M_ReedScreen', (0.72, 0.62, 0.44, 1.0), 0.9),
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

def add_roof_wedge(name, width, depth, height, location, material=None):
    mesh = bpy.data.meshes.new(name)
    hw, hd, h = width / 2.0, depth / 2.0, height
    verts = [
        (-hw, -hd, 0), (hw, -hd, 0), (hw, hd, 0), (-hw, hd, 0),
        (-hw * 0.7, 0, h), (hw * 0.7, 0, h)
    ]
    faces = [
        (0, 1, 2, 3),
        (0, 1, 5, 4),
        (2, 3, 4, 5),
        (0, 4, 3),
        (1, 2, 5)
    ]
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = location
    bpy.context.collection.objects.link(obj)
    if material:
        obj.data.materials.append(material)
    return obj

# 1. Scaffolding Model
def build_scaffold(output_path):
    reset_scene()
    mats = get_materials()

    pole_h = 1.3
    add_cylinder('Pole_FL', 0.04, pole_h, (-0.6, -0.6, pole_h / 2), material=mats['bamboo'])
    add_cylinder('Pole_FR', 0.04, pole_h, (0.6, -0.6, pole_h / 2), material=mats['bamboo'])
    add_cylinder('Pole_BL', 0.04, pole_h, (-0.6, 0.6, pole_h / 2), material=mats['bamboo'])
    add_cylinder('Pole_BR', 0.04, pole_h, (0.6, 0.6, pole_h / 2), material=mats['bamboo'])

    add_cube('H_Brace_F1', (1.25, 0.05, 0.05), (0, -0.6, 0.5), material=mats['wood'])
    add_cube('H_Brace_F2', (1.25, 0.05, 0.05), (0, -0.6, 1.0), material=mats['wood'])
    add_cube('H_Brace_B1', (1.25, 0.05, 0.05), (0, 0.6, 0.5), material=mats['wood'])
    add_cube('H_Brace_B2', (1.25, 0.05, 0.05), (0, 0.6, 1.0), material=mats['wood'])
    add_cube('H_Brace_L', (0.05, 1.25, 0.05), (-0.6, 0, 0.75), material=mats['wood'])
    add_cube('H_Brace_R', (0.05, 1.25, 0.05), (0.6, 0, 0.75), material=mats['wood'])

    add_cube('Plank1', (1.2, 0.35, 0.04), (0, -0.2, 0.52), material=mats['light_wood'])
    add_cube('Hemp_Mat', (0.02, 0.9, 0.75), (-0.61, 0.1, 0.7), material=mats['matting'])
    add_cube('Frame_Post', (0.1, 0.1, 0.8), (0, 0, 0.4), material=mats['wood'])

    bpy.ops.export_scene.gltf(filepath=output_path, export_format='GLB')
    print(f"[Blender] Exported scaffold to {output_path}")

# 2. Residential Level 1 (Machiya)
def build_machiya(output_path):
    reset_scene()
    mats = get_materials()

    add_cube('Stone_Base', (1.5, 1.5, 0.12), (0, 0, 0.06), material=mats['stone'])
    add_cube('House_Body', (1.3, 1.3, 0.75), (0, 0, 0.12 + 0.375), material=mats['plaster'])

    add_cube('Corner_FL', (0.1, 0.1, 0.78), (-0.6, -0.6, 0.5), material=mats['wood'])
    add_cube('Corner_FR', (0.1, 0.1, 0.78), (0.6, -0.6, 0.5), material=mats['wood'])
    add_cube('Corner_BL', (0.1, 0.1, 0.78), (-0.6, 0.6, 0.5), material=mats['wood'])
    add_cube('Corner_BR', (0.1, 0.1, 0.78), (0.6, 0.6, 0.5), material=mats['wood'])

    add_cube('Front_Koushi', (0.9, 0.04, 0.55), (0, -0.63, 0.45), material=mats['wood'])
    add_cube('Entry_Step', (0.5, 0.18, 0.08), (0, -0.72, 0.04), material=mats['stone'])

    add_roof_wedge('Kawara_Roof', 1.6, 1.6, 0.45, (0, 0, 0.87), material=mats['roof'])
    add_cube('Roof_Ridge', (1.2, 0.12, 0.08), (0, 0, 1.33), material=mats['roof'])

    bpy.ops.export_scene.gltf(filepath=output_path, export_format='GLB')
    print(f"[Blender] Exported machiya L1 to {output_path}")

# 3. Commercial Level 1 (Shouten)
def build_shouten(output_path):
    reset_scene()
    mats = get_materials()

    add_cube('Stone_Base', (1.5, 1.5, 0.12), (0, 0, 0.06), material=mats['stone'])
    add_cube('Shop_Main', (1.3, 1.1, 0.85), (0, 0.1, 0.12 + 0.425), material=mats['plaster'])
    add_cube('Display_Counter', (1.0, 0.35, 0.32), (0, -0.45, 0.28), material=mats['light_wood'])

    add_cube('Eave_Support_L', (0.08, 0.08, 0.85), (-0.58, -0.6, 0.5), material=mats['wood'])
    add_cube('Eave_Support_R', (0.08, 0.08, 0.85), (0.58, -0.6, 0.5), material=mats['wood'])

    add_cube('Shop_Noren', (1.0, 0.03, 0.25), (0, -0.61, 0.75), material=mats['noren'])
    add_cube('Front_Hisashi', (1.4, 0.45, 0.06), (0, -0.52, 0.89), material=mats['roof'])

    add_roof_wedge('Main_Roof', 1.5, 1.3, 0.4, (0, 0.1, 0.97), material=mats['roof'])
    add_cube('Shop_Ridge', (1.1, 0.1, 0.08), (0, 0.1, 1.38), material=mats['roof'])

    bpy.ops.export_scene.gltf(filepath=output_path, export_format='GLB')
    print(f"[Blender] Exported shouten L1 to {output_path}")

# 4. Industrial Level 1 (Workshop)
def build_workshop(output_path):
    reset_scene()
    mats = get_materials()

    add_cube('Stone_Base', (1.5, 1.5, 0.12), (0, 0, 0.06), material=mats['stone'])
    add_cube('Workshop_Shed', (1.0, 1.3, 0.72), (-0.15, 0, 0.12 + 0.36), material=mats['wood'])
    add_cube('Bay_Lintel', (1.0, 0.08, 0.08), (-0.15, -0.62, 0.65), material=mats['wood'])

    add_cube('Kiln_Base', (0.45, 0.65, 0.48), (0.48, 0.2, 0.34), material=mats['brick'])
    add_cylinder('Smokestack', 0.1, 1.2, (0.48, 0.2, 0.9), vertices=8, material=mats['brick'])
    add_cylinder('Chimney_Rim', 0.13, 0.08, (0.48, 0.2, 1.48), vertices=8, material=mats['brick'])

    add_cylinder('Log1', 0.07, 0.55, (0.48, -0.42, 0.18), rotation=(math.pi/2, 0, 0), vertices=6, material=mats['light_wood'])
    add_cylinder('Log2', 0.07, 0.55, (0.48, -0.42, 0.30), rotation=(math.pi/2, 0, 0), vertices=6, material=mats['light_wood'])

    add_roof_wedge('Shed_Roof', 1.25, 1.45, 0.35, (-0.15, 0, 0.84), material=mats['roof'])

    bpy.ops.export_scene.gltf(filepath=output_path, export_format='GLB')
    print(f"[Blender] Exported workshop to {output_path}")

# 5. Residential Level 2: Fireproof Earthen Storehouse (Kura-zukuri / 蔵造り)
def build_residential_l2_kura(output_path):
    reset_scene()
    mats = get_materials()

    # Heavy Raised Stone Plinth
    add_cube('Stone_Base', (1.6, 1.6, 0.16), (0, 0, 0.08), material=mats['stone'])

    # Ground Floor: Thick Charcoal/Black Plaster
    add_cube('Ground_Wall', (1.38, 1.38, 0.95), (0, 0, 0.16 + 0.475), material=mats['black_plaster'])

    # White Plaster Corner Pilasters / Quoins
    for ox in [-0.64, 0.64]:
        for oy in [-0.64, 0.64]:
            add_cube(f'Quoin_{ox}_{oy}', (0.14, 0.14, 0.96), (ox, oy, 0.64), material=mats['plaster'])

    # Heavy Fireproof Sliding Double Door (Front)
    add_cube('Kura_Door', (0.65, 0.08, 0.72), (0, -0.66, 0.52), material=mats['black_plaster'])
    add_cube('Door_Trim', (0.75, 0.04, 0.06), (0, -0.66, 0.90), material=mats['wood'])

    # Intermediate Eave Roof (Hisashi) separating 1st and 2nd story
    add_cube('Mid_Eave', (1.62, 1.62, 0.07), (0, 0, 1.14), material=mats['roof'])

    # Second Floor: Fireproof Earthen White/Black Plaster
    add_cube('Upper_Wall', (1.28, 1.28, 0.75), (0, 0, 1.175 + 0.375), material=mats['plaster'])

    # Traditional Recessed Fireproof Shutter Window (Mushiko-mado)
    add_cube('Upper_Window', (0.50, 0.06, 0.32), (0, -0.62, 1.55), material=mats['black_plaster'])
    add_cube('Window_Bars', (0.42, 0.08, 0.04), (0, -0.62, 1.55), material=mats['wood'])

    # Massive Multi-Tiered Kawara Clay Tile Roof
    add_roof_wedge('Heavy_Roof', 1.72, 1.72, 0.52, (0, 0, 1.925), material=mats['roof'])

    # Heavy Ornamental Ridge Cap (Mune-gawara)
    add_cube('Heavy_Ridge', (1.35, 0.16, 0.12), (0, 0, 2.45), material=mats['roof'])

    bpy.ops.export_scene.gltf(filepath=output_path, export_format='GLB')
    print(f"[Blender] Exported Kura-zukuri L2 to {output_path}")

# 6. Commercial Level 2: Two-Story Merchant Machiya (大店 / Oodana)
def build_commercial_l2_machiya(output_path):
    reset_scene()
    mats = get_materials()

    # Stone Foundation Base
    add_cube('Stone_Base', (1.6, 1.6, 0.14), (0, 0, 0.07), material=mats['stone'])

    # Ground Floor: Extended Shopfront & Display
    add_cube('Ground_Shop', (1.36, 1.25, 0.95), (0, 0.08, 0.14 + 0.475), material=mats['plaster'])
    add_cube('Shop_Counter', (1.1, 0.4, 0.34), (0, -0.48, 0.31), material=mats['light_wood'])

    # Robust Front Timber Columns
    add_cube('Col_L', (0.1, 0.1, 0.95), (-0.62, -0.62, 0.61), material=mats['wood'])
    add_cube('Col_R', (0.1, 0.1, 0.95), (0.62, -0.62, 0.61), material=mats['wood'])

    # Wide Indigo Fabric Noren Curtain
    add_cube('Wide_Noren', (1.15, 0.03, 0.30), (0, -0.63, 0.85), material=mats['noren'])

    # Intermediate Decorative Awning Roof
    add_cube('Shop_Awning', (1.65, 0.55, 0.07), (0, -0.45, 1.10), material=mats['roof'])

    # Second Floor: Living Quarters with Wooden Lattices (Koushi)
    add_cube('Upper_Living', (1.32, 1.20, 0.80), (0, 0.06, 1.14 + 0.40), material=mats['plaster'])
    add_cube('Upper_Lattice_F', (1.0, 0.04, 0.50), (0, -0.56, 1.54), material=mats['wood'])
    add_cube('Upper_Lattice_L', (0.04, 0.70, 0.50), (-0.64, 0.06, 1.54), material=mats['wood'])

    # Upper Gabled Tile Roof
    add_roof_wedge('Upper_Roof', 1.68, 1.45, 0.48, (0, 0.06, 1.94), material=mats['roof'])
    add_cube('Upper_Ridge', (1.28, 0.14, 0.10), (0, 0.06, 2.43), material=mats['roof'])

    bpy.ops.export_scene.gltf(filepath=output_path, export_format='GLB')
    print(f"[Blender] Exported Commercial L2 Machiya to {output_path}")

# 7. Ploppable Civic Service: Fire Watchtower (Hinomi-yagura / 火の見櫓)
def build_fire_watchtower(output_path):
    reset_scene()
    mats = get_materials()

    # Base stone plinth
    add_cube('Stone_Base', (1.4, 1.4, 0.12), (0, 0, 0.06), material=mats['stone'])

    # 4 Angled main corner timber posts rising to 2.4m
    posts = [
        ('Leg_FL', (-0.45, -0.45, 1.2), (0.04, -0.04, 0)),
        ('Leg_FR', (0.45, -0.45, 1.2), (0.04, 0.04, 0)),
        ('Leg_BL', (-0.45, 0.45, 1.2), (-0.04, -0.04, 0)),
        ('Leg_BR', (0.45, 0.45, 1.2), (-0.04, 0.04, 0)),
    ]
    for name, pos, rot in posts:
        add_cylinder(name, 0.045, 2.35, pos, rotation=rot, vertices=8, material=mats['wood'])

    # Horizontal tie beams at tiers
    for h in [0.75, 1.5, 2.2]:
        s = 0.95 - (h * 0.15)
        add_cube(f'Tie_F_{h}', (s, 0.04, 0.04), (0, -s / 2, h), material=mats['wood'])
        add_cube(f'Tie_B_{h}', (s, 0.04, 0.04), (0, s / 2, h), material=mats['wood'])
        add_cube(f'Tie_L_{h}', (0.04, s, 0.04), (-s / 2, 0, h), material=mats['wood'])
        add_cube(f'Tie_R_{h}', (0.04, s, 0.04), (s / 2, 0, h), material=mats['wood'])

    # Central access ladder rungs
    for rh in [0.4, 0.7, 1.0, 1.3, 1.6, 1.9, 2.2]:
        add_cube(f'Rung_{rh}', (0.28, 0.03, 0.03), (0, -0.25, rh), material=mats['bamboo'])

    # Upper lookout platform (tatami / wooden floor)
    add_cube('Lookout_Floor', (0.85, 0.85, 0.06), (0, 0, 2.32), material=mats['light_wood'])

    # Wooden lookout safety railing
    add_cube('Railing_F', (0.85, 0.03, 0.25), (0, -0.41, 2.45), material=mats['wood'])
    add_cube('Railing_B', (0.85, 0.03, 0.25), (0, 0.41, 2.45), material=mats['wood'])
    add_cube('Railing_L', (0.03, 0.85, 0.25), (-0.41, 0, 2.45), material=mats['wood'])
    add_cube('Railing_R', (0.03, 0.85, 0.25), (0.41, 0, 2.45), material=mats['wood'])

    # 4 Lookout roof support posts
    for rx, ry in [(-0.38, -0.38), (0.38, -0.38), (-0.38, 0.38), (0.38, 0.38)]:
        add_cylinder(f'Roof_Post_{rx}_{ry}', 0.03, 0.65, (rx, ry, 2.65), vertices=6, material=mats['wood'])

    # Lookout Hip Roof (Kawara tiles)
    add_roof_wedge('Lookout_Roof', 1.15, 1.15, 0.35, (0, 0, 2.95), material=mats['roof'])
    add_cube('Lookout_Ridge', (0.8, 0.08, 0.06), (0, 0, 3.32), material=mats['roof'])

    # Hanging Bronze Alarm Bell (Hanshō / 半鐘)
    add_cylinder('Alarm_Bell', 0.10, 0.22, (0, 0, 2.72), vertices=8, material=mats['bronze'])
    add_cylinder('Bell_Hanger', 0.015, 0.12, (0, 0, 2.85), vertices=4, material=mats['wood'])

    bpy.ops.export_scene.gltf(filepath=output_path, export_format='GLB')
    print(f"[Blender] Exported Fire Watchtower to {output_path}")

# 8. Commercial Level 3: Ginza Bricktown Giyōfū Architecture (擬洋風 煉瓦街)
def build_commercial_l3_giyofu(output_path):
    reset_scene()
    mats = get_materials()

    # Heavy Stone Foundation Base
    add_cube('Stone_Base', (1.7, 1.7, 0.16), (0, 0, 0.08), material=mats['stone'])

    # Ground Floor Red Brick Exterior
    add_cube('Ground_Brick', (1.5, 1.45, 0.95), (0, 0.05, 0.16 + 0.475), material=mats['brick'])

    # Arched Glass Display Windows (Front Ground Floor)
    add_cube('Glass_Win_L', (0.42, 0.04, 0.55), (-0.45, -0.68, 0.65), material=mats['roof'])
    add_cube('Glass_Win_R', (0.42, 0.04, 0.55), (0.45, -0.68, 0.65), material=mats['roof'])
    # Arched Lintels / Trim
    add_cube('Arch_L', (0.48, 0.08, 0.10), (-0.45, -0.68, 0.96), material=mats['plaster'])
    add_cube('Arch_R', (0.48, 0.08, 0.10), (0.45, -0.68, 0.96), material=mats['plaster'])

    # Central Entrance Doorway
    add_cube('Front_Door', (0.36, 0.04, 0.70), (0, -0.68, 0.52), material=mats['wood'])

    # Ground Floor Corner Stone Quoins (interlocking corner blocks)
    for qx, qy in [(-0.76, -0.68), (0.76, -0.68), (-0.76, 0.78), (0.76, 0.78)]:
        add_cube(f'Quoin_G_{qx}_{qy}', (0.12, 0.12, 0.95), (qx, qy, 0.635), material=mats['plaster'])

    # Intermediate Stone String Course Belt
    add_cube('Belt_Cornice', (1.65, 1.55, 0.10), (0, 0.05, 1.16), material=mats['plaster'])

    # Second Floor Red Brick Facade
    add_cube('Upper_Brick', (1.46, 1.40, 0.85), (0, 0.05, 1.21 + 0.425), material=mats['brick'])

    # Upper Arched Windows
    add_cube('Upper_Win_L', (0.36, 0.04, 0.45), (-0.42, -0.66, 1.65), material=mats['roof'])
    add_cube('Upper_Win_R', (0.36, 0.04, 0.45), (0.42, -0.66, 1.65), material=mats['roof'])
    add_cube('Upper_Arch_L', (0.42, 0.06, 0.08), (-0.42, -0.66, 1.90), material=mats['plaster'])
    add_cube('Upper_Arch_R', (0.42, 0.06, 0.08), (0.42, -0.66, 1.90), material=mats['plaster'])

    # Upper Corner Quoins
    for qx, qy in [(-0.74, -0.66), (0.74, -0.66), (-0.74, 0.76), (0.74, 0.76)]:
        add_cube(f'Quoin_U_{qx}_{qy}', (0.10, 0.10, 0.85), (qx, qy, 1.635), material=mats['plaster'])

    # Second-Story Ornamental Balcony & Railing
    add_cube('Balcony_Slab', (1.05, 0.35, 0.08), (0, -0.82, 1.22), material=mats['stone'])
    add_cube('Balcony_Rail_F', (1.05, 0.04, 0.22), (0, -0.98, 1.35), material=mats['wood'])
    add_cube('Balcony_Rail_L', (0.04, 0.35, 0.22), (-0.51, -0.82, 1.35), material=mats['wood'])
    add_cube('Balcony_Rail_R', (0.04, 0.35, 0.22), (0.51, -0.82, 1.35), material=mats['wood'])

    # Western Stone Cornice Eaves
    add_cube('Roof_Cornice', (1.68, 1.58, 0.08), (0, 0.05, 2.08), material=mats['plaster'])

    # Dark Japanese Kawara Tiled Roof (Giyōfū Hybrid)
    add_roof_wedge('Giyofu_Roof', 1.76, 1.65, 0.46, (0, 0.05, 2.12), material=mats['roof'])
    add_cube('Giyofu_Ridge', (1.35, 0.14, 0.10), (0, 0.05, 2.59), material=mats['roof'])

    # Central Front Clock/Pediment Feature
    add_cube('Pediment_Base', (0.45, 0.12, 0.22), (0, -0.70, 2.18), material=mats['plaster'])
    add_cylinder('Clock_Face', 0.09, 0.04, (0, -0.76, 2.22), rotation=(math.pi / 2, 0, 0), vertices=12, material=mats['stone'])

    bpy.ops.export_scene.gltf(filepath=output_path, export_format='GLB')
    print(f"[Blender] Exported Giyōfū Commercial L3 to {output_path}")

# 9. Ploppable Civic Service: Communal Well (Ido / 井戸)
def build_communal_well(output_path):
    reset_scene()
    mats = get_materials()

    # Cobblestone Ground Apron
    add_cube('Cobble_Paving', (1.5, 1.5, 0.06), (0, 0, 0.03), material=mats['stone'])

    # Octagonal/Cylindrical Timber & Stone Well Rim (Idogawa)
    add_cylinder('Well_Rim', 0.46, 0.44, (0, 0, 0.25), vertices=8, material=mats['wood'])
    # Inner Water Disc
    add_cylinder('Well_Water', 0.36, 0.04, (0, 0, 0.32), vertices=8, material=mats['roof'])

    # Two Main Timber Support Posts (Hashira)
    add_cylinder('Post_L', 0.04, 1.30, (-0.42, 0, 0.68), vertices=6, material=mats['wood'])
    add_cylinder('Post_R', 0.04, 1.30, (0.42, 0, 0.68), vertices=6, material=mats['wood'])

    # Horizontal Top Crossbeam
    add_cube('Crossbeam', (0.96, 0.07, 0.07), (0, 0, 1.32), material=mats['wood'])

    # Small Gabled Timber Roof (Idoyane)
    add_roof_wedge('Well_Roof', 1.10, 0.85, 0.34, (0, 0, 1.35), material=mats['wood'])
    add_cube('Well_Ridge', (0.85, 0.08, 0.05), (0, 0, 1.70), material=mats['wood'])

    # Bronze / Iron Pulley Wheel (Tsurube)
    add_cylinder('Pulley', 0.08, 0.04, (0, 0, 1.22), rotation=(0, math.pi / 2, 0), vertices=8, material=mats['bronze'])

    # Hanging Hemp Rope
    add_cylinder('Rope', 0.01, 0.65, (0, 0, 0.88), vertices=4, material=mats['bamboo'])

    # Wooden Water Bucket (Teoke)
    add_cylinder('Bucket', 0.10, 0.18, (0.16, 0.24, 0.54), vertices=6, material=mats['light_wood'])

    bpy.ops.export_scene.gltf(filepath=output_path, export_format='GLB')
    print(f"[Blender] Exported Communal Well to {output_path}")

# 10. Ploppable Civic Service: Traditional Teahouse (Ochaya / お茶屋)
def build_civic_ochaya(output_path):
    reset_scene()
    mats = get_materials()

    # Stone Foundation Plinth
    add_cube('Stone_Foundation', (1.65, 1.55, 0.12), (0, 0, 0.06), material=mats['stone'])

    # Ground Floor Dark Cedar Lattice Walls
    add_cube('GF_Body', (1.50, 1.40, 0.90), (0, 0, 0.57), material=mats['cedar'])

    # Reed Screen (Sudare) Front Sliding Panels
    add_cube('GF_Sudare', (1.10, 0.06, 0.65), (0, -0.68, 0.55), material=mats['screen'])

    # Intermediate Eave Roof between 1F and 2F
    add_roof_wedge('Mid_Eave', 1.75, 1.60, 0.22, (0, 0, 1.05), material=mats['roof'])

    # Second Story Overhanging Upper Floor
    add_cube('2F_Body', (1.55, 1.45, 0.90), (0, 0, 1.55), material=mats['cedar'])

    # Upper Balcony Lattice Railing (Koushi) & Reed Screens
    add_cube('2F_Sudare_F', (1.20, 0.06, 0.60), (0, -0.71, 1.55), material=mats['screen'])
    add_cube('2F_Balcony', (1.60, 0.08, 0.35), (0, -0.74, 1.25), material=mats['wood'])

    # Upper Main Japanese Kawara Tiled Roof with Wide Eaves
    add_roof_wedge('Main_Roof', 1.95, 1.80, 0.48, (0, 0, 2.05), material=mats['roof'])
    add_cube('Roof_Ridge', (1.60, 0.14, 0.10), (0, 0, 2.54), material=mats['roof'])

    # Overhanging Entrance Porch Canopy
    add_cube('Canopy_Beam', (1.30, 0.08, 0.08), (0, -0.92, 0.98), material=mats['wood'])
    add_roof_wedge('Porch_Canopy', 1.35, 0.45, 0.15, (0, -0.92, 1.02), material=mats['roof'])

    # 3 Red Paper Hanging Lanterns (Chōchin / 提灯)
    for i, x_off in enumerate([-0.42, 0.0, 0.42]):
        add_cylinder(f'Lantern_Cords_{i}', 0.015, 0.12, (x_off, -0.90, 0.92), vertices=4, material=mats['bamboo'])
        add_cylinder(f'Lantern_Body_{i}', 0.09, 0.20, (x_off, -0.90, 0.78), vertices=8, material=mats['red_lantern'])
        add_cylinder(f'Lantern_Cap_{i}', 0.07, 0.04, (x_off, -0.90, 0.89), vertices=6, material=mats['black_plaster'])

    bpy.ops.export_scene.gltf(filepath=output_path, export_format='GLB')
    print(f"[Blender] Exported Traditional Teahouse to {output_path}")

# 11. Ploppable Civic Service: Public Bathhouse (Sentō / 銭湯)
def build_civic_sento(output_path):
    reset_scene()
    mats = get_materials()

    # Stone Slab Foundation
    add_cube('Sento_Foundation', (1.68, 1.60, 0.14), (0, 0, 0.07), material=mats['stone'])

    # Plaster & Timber Bathhouse Main Hall
    add_cube('Main_Hall', (1.52, 1.44, 1.15), (0, 0, 0.71), material=mats['plaster'])
    add_cube('Timber_Dado', (1.54, 1.46, 0.45), (0, 0, 0.36), material=mats['wood'])

    # Grand Gabled Japanese Tile Roof
    add_roof_wedge('Sento_Roof', 1.95, 1.80, 0.58, (0, 0, 1.32), material=mats['roof'])
    add_cube('Sento_Ridge', (1.60, 0.14, 0.12), (0, 0, 1.92), material=mats['roof'])

    # Tall Square Wooden Steam Ventilation Chimney (Yagura / 煙突) at Rear
    add_cube('Steam_Chimney', (0.32, 0.32, 1.25), (0, 0.48, 1.85), material=mats['cedar'])
    add_roof_wedge('Chimney_Cap', 0.44, 0.44, 0.16, (0, 0.48, 2.50), material=mats['roof'])

    # Entrance Porch with Gabled Karahafu Canopy
    add_roof_wedge('Karahafu_Canopy', 0.85, 0.52, 0.22, (0, -0.90, 0.95), material=mats['roof'])
    add_cylinder('Post_Left', 0.04, 0.88, (-0.36, -0.90, 0.48), vertices=6, material=mats['wood'])
    add_cylinder('Post_Right', 0.04, 0.88, (0.36, -0.90, 0.48), vertices=6, material=mats['wood'])

    # Split Entrance Noren Curtain (湯)
    add_cube('Noren_Bar', (0.75, 0.04, 0.04), (0, -0.74, 0.85), material=mats['bamboo'])
    add_cube('Noren_Curtain', (0.64, 0.03, 0.34), (0, -0.74, 0.65), material=mats['noren'])

    bpy.ops.export_scene.gltf(filepath=output_path, export_format='GLB')
    print(f"[Blender] Exported Public Bathhouse to {output_path}")

def main():
    target_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'models'))
    os.makedirs(target_dir, exist_ok=True)

    build_scaffold(os.path.join(target_dir, 'building_scaffold.glb'))
    build_machiya(os.path.join(target_dir, 'residential_l1_machiya.glb'))
    build_shouten(os.path.join(target_dir, 'commercial_l1_shouten.glb'))
    build_workshop(os.path.join(target_dir, 'industrial_l1_workshop.glb'))
    build_residential_l2_kura(os.path.join(target_dir, 'residential_l2_kura.glb'))
    build_commercial_l2_machiya(os.path.join(target_dir, 'commercial_l2_machiya.glb'))
    build_fire_watchtower(os.path.join(target_dir, 'service_fire_watchtower.glb'))
    build_commercial_l3_giyofu(os.path.join(target_dir, 'commercial_l3_giyofu.glb'))
    build_communal_well(os.path.join(target_dir, 'service_communal_well.glb'))
    build_civic_ochaya(os.path.join(target_dir, 'civic_ochaya.glb'))
    build_civic_sento(os.path.join(target_dir, 'civic_sento.glb'))
    try:
        from generate_koban import build_civic_koban
        build_civic_koban(os.path.join(target_dir, 'civic_koban.glb'))
    except Exception as e:
        print(f"[Blender Generator] Notice: koban generator deferred: {e}")
    print("[Blender Generator] All 12 historical models built and exported successfully!")

if __name__ == '__main__':
    main()

