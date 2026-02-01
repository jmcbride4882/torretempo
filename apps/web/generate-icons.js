// Simple icon generator script using sharp
// Run: node generate-icons.js

const fs = require('fs');
const path = require('path');

async function generateIcons() {
  try {
    // Check if sharp is installed
    const sharp = require('sharp');
    
    const svgPath = path.join(__dirname, 'public', 'icon.svg');
    const publicDir = path.join(__dirname, 'public');
    
    if (!fs.existsSync(svgPath)) {
      console.error('❌ icon.svg not found in public directory');
      process.exit(1);
    }
    
    console.log('🎨 Generating PNG icons from SVG...');
    
    // Read SVG
    const svgBuffer = fs.readFileSync(svgPath);
    
    // Generate 192x192
    await sharp(svgBuffer)
      .resize(192, 192)
      .png()
      .toFile(path.join(publicDir, 'icon-192.png'));
    console.log('✅ Generated icon-192.png');
    
    // Generate 512x512
    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, 'icon-512.png'));
    console.log('✅ Generated icon-512.png');
    
    // Generate 180x180 (Apple Touch Icon)
    await sharp(svgBuffer)
      .resize(180, 180)
      .png()
      .toFile(path.join(publicDir, 'apple-touch-icon.png'));
    console.log('✅ Generated apple-touch-icon.png');
    
    // Generate 32x32 (Favicon)
    await sharp(svgBuffer)
      .resize(32, 32)
      .png()
      .toFile(path.join(publicDir, 'favicon-32x32.png'));
    console.log('✅ Generated favicon-32x32.png');
    
    // Generate 16x16 (Favicon)
    await sharp(svgBuffer)
      .resize(16, 16)
      .png()
      .toFile(path.join(publicDir, 'favicon-16x16.png'));
    console.log('✅ Generated favicon-16x16.png');
    
    console.log('\n✨ All icons generated successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Update manifest.json to reference PNG icons');
    console.log('2. Update index.html to reference PNG favicons');
    console.log('3. Test PWA installation on mobile devices');
    
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('❌ Sharp library not found. Install it first:');
      console.error('   npm install --save-dev sharp');
      console.error('\nOr use an online converter:');
      console.error('   https://realfavicongenerator.net/');
    } else {
      console.error('❌ Error generating icons:', error);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  generateIcons();
}

module.exports = { generateIcons };
