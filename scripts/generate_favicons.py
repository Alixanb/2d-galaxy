import os
from PIL import Image

def generate_favicons(source_path, output_dir):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    with Image.open(source_path) as img:
        # Create a square version by padding or cropping
        # Since it's 158x200, we'll pad the width to 200 or just resize to square
        # Favicons usually look better if they fill the space.
        # We'll create a square canvas and paste the centered image.
        
        size = max(img.size)
        square_img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        offset = ((size - img.width) // 2, (size - img.height) // 2)
        square_img.paste(img, offset)

        # Generate PNGs
        sizes = {
            'favicon-16x16.png': 16,
            'favicon-32x32.png': 32,
            'apple-touch-icon.png': 180,
            'android-chrome-192x192.png': 192,
            'android-chrome-512x512.png': 512,
        }

        for name, s in sizes.items():
            resized = square_img.resize((s, s), Image.Resampling.LANCZOS)
            resized.save(os.path.join(output_dir, name))
            print(f"Generated {name}")

        # Generate .ico
        ico_sizes = [16, 32, 48]
        ico_images = [square_img.resize((s, s), Image.Resampling.LANCZOS) for s in ico_sizes]
        ico_images[0].save(
            os.path.join(output_dir, 'favicon.ico'),
            format='ICO',
            sizes=[(s, s) for s in ico_sizes],
            append_images=ico_images[1:]
        )
        print("Generated favicon.ico")

        # Generate OG Image (1200x630)
        og_size = (1200, 630)
        og_img = Image.new('RGB', og_size, (19, 14, 14)) # Matching --bg: #130e0e
        
        # Resize ship for OG image (keep it reasonable size)
        ship_og_height = 300
        ship_og_width = int(img.width * (ship_og_height / img.height))
        ship_resized = img.resize((ship_og_width, ship_og_height), Image.Resampling.LANCZOS)
        
        # Paste centered
        offset = ((og_size[0] - ship_og_width) // 2, (og_size[1] - ship_og_height) // 2)
        og_img.paste(ship_resized, offset, ship_resized if ship_resized.mode == 'RGBA' else None)
        
        og_img.save(os.path.join(output_dir, 'assets', 'og-image.png'))
        print("Generated og-image.png")

if __name__ == "__main__":
    generate_favicons('public/assets/ship.png', 'public')
