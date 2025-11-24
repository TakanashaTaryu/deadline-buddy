const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const os = require('os');

class MediaProcessor {
    /**
     * Convert image buffer to WebP sticker format
     * @param {Buffer} imageBuffer - Input image buffer
     * @returns {Promise<Buffer>} - WebP sticker buffer
     */
    async imageToSticker(imageBuffer) {
        try {
            console.log('🖼️ Converting image to sticker...');

            const stickerBuffer = await sharp(imageBuffer)
                .resize(512, 512, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .webp()
                .toBuffer();

            console.log(`✅ Image converted to sticker (${stickerBuffer.length} bytes)`);
            return stickerBuffer;

        } catch (error) {
            console.error('❌ Error converting image to sticker:', error.message);
            throw new Error('Failed to convert image to sticker');
        }
    }

    /**
     * Extract first frame from video and convert to WebP sticker
     * @param {Buffer} videoBuffer - Input video buffer
     * @returns {Promise<Buffer>} - WebP sticker buffer
     */
    async videoToSticker(videoBuffer) {
        return new Promise((resolve, reject) => {
            try {
                console.log('🎥 Converting video to sticker...');

                // Create temporary files
                const tempDir = os.tmpdir();
                const videoPath = path.join(tempDir, `video_${Date.now()}.mp4`);
                const framePath = path.join(tempDir, `frame_${Date.now()}.png`);

                // Write video buffer to temp file
                fs.writeFileSync(videoPath, videoBuffer);

                // Extract first frame using ffmpeg
                ffmpeg(videoPath)
                    .screenshots({
                        timestamps: ['00:00:00.000'],
                        filename: path.basename(framePath),
                        folder: tempDir,
                        size: '512x512'
                    })
                    .on('end', async () => {
                        try {
                            // Convert frame to WebP sticker
                            const frameBuffer = fs.readFileSync(framePath);
                            const stickerBuffer = await this.imageToSticker(frameBuffer);

                            // Cleanup temp files
                            fs.unlinkSync(videoPath);
                            fs.unlinkSync(framePath);

                            console.log(`✅ Video converted to sticker (${stickerBuffer.length} bytes)`);
                            resolve(stickerBuffer);

                        } catch (error) {
                            // Cleanup on error
                            try {
                                fs.unlinkSync(videoPath);
                                if (fs.existsSync(framePath)) fs.unlinkSync(framePath);
                            } catch (cleanupError) {
                                console.error('⚠️ Cleanup error:', cleanupError.message);
                            }
                            reject(error);
                        }
                    })
                    .on('error', (error) => {
                        // Cleanup on error
                        try {
                            fs.unlinkSync(videoPath);
                        } catch (cleanupError) {
                            console.error('⚠️ Cleanup error:', cleanupError.message);
                        }
                        console.error('❌ Error extracting video frame:', error.message);
                        reject(new Error('Failed to extract video frame'));
                    });

            } catch (error) {
                console.error('❌ Error converting video to sticker:', error.message);
                reject(new Error('Failed to convert video to sticker'));
            }
        });
    }

    /**
     * Convert media (image or video) to sticker
     * @param {Buffer} mediaBuffer - Input media buffer
     * @param {string} mimetype - Media MIME type
     * @returns {Promise<Buffer>} - WebP sticker buffer
     */
    async mediaToSticker(mediaBuffer, mimetype) {
        // Handle null or undefined mimetype - default to image
        if (!mimetype) {
            console.log('⚠️ No mimetype provided, defaulting to image processing');
            return await this.imageToSticker(mediaBuffer);
        }

        if (mimetype.startsWith('image/')) {
            return await this.imageToSticker(mediaBuffer);
        } else if (mimetype.startsWith('video/')) {
            return await this.videoToSticker(mediaBuffer);
        } else {
            // Unknown mimetype, try image processing as fallback
            console.log(`⚠️ Unknown mimetype: ${mimetype}, trying image processing`);
            return await this.imageToSticker(mediaBuffer);
        }
    }
}

module.exports = new MediaProcessor();
