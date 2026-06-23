import os
from PIL import Image

def generate_icons():
    source_path = "src-tauri/icons/icon.png"
    if not os.path.exists(source_path):
        print(f"Source icon not found at: {source_path}")
        return

    print(f"Loading source icon: {source_path}")
    img = Image.open(source_path)

    # 1. Generate Android launcher icons
    android_res_path = "android/app/src/main/res"
    android_sizes = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192
    }

    if os.path.exists(android_res_path):
        print("Generating Android mipmap icons...")
        for folder, size in android_sizes.items():
            folder_path = os.path.join(android_res_path, folder)
            os.makedirs(folder_path, exist_ok=True)
            
            # Resize image with Lanczos interpolation for high quality
            resized_img = img.resize((size, size), Image.Resampling.LANCZOS)
            
            # Save regular launcher icon
            resized_img.save(os.path.join(folder_path, "ic_launcher.png"), "PNG")
            
            # Save round launcher icon
            resized_img.save(os.path.join(folder_path, "ic_launcher_round.png"), "PNG")
            
            # Save foreground launcher icon
            resized_img.save(os.path.join(folder_path, "ic_launcher_foreground.png"), "PNG")
            
            print(f" -> Generated {folder} ({size}x{size})")
    else:
        print(f"Android resources directory not found at: {android_res_path}")

    # 2. Generate iOS launcher icon (Capacitor 8 iOS project uses a single 1024x1024 appicon)
    ios_icon_dir = "ios/App/App/Assets.xcassets/AppIcon.appiconset"
    if os.path.exists(ios_icon_dir):
        print("Generating iOS AppIcon...")
        ios_icon_path = os.path.join(ios_icon_dir, "AppIcon-512@2x.png")
        
        # Resize to 1024x1024
        resized_ios = img.resize((1024, 1024), Image.Resampling.LANCZOS)
        resized_ios.save(ios_icon_path, "PNG")
        print(f" -> Generated iOS AppIcon-512@2x.png (1024x1024)")
    else:
        print(f"iOS AppIcon directory not found at: {ios_icon_dir}")

    print("Mobile launcher icon generation completed successfully!")

if __name__ == "__main__":
    generate_icons()
