import { Injectable } from '@nestjs/common';
import { UploadApiErrorResponse, UploadApiResponse, v2 } from 'cloudinary';
import toStream = require('buffer-to-stream');

@Injectable()
export class CloudinaryService {
  async uploadImage(
    file: Express.Multer.File,
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return this.uploadToCloudinary(file);
  }

  async uploadImages(
    files: Express.Multer.File[],
  ): Promise<(UploadApiResponse | UploadApiErrorResponse)[]> {
    //console.log(files);
    const uploadPromises = files?.map((file) => this.uploadToCloudinary(file));
    return Promise.all(uploadPromises);
  }

  async deleteImage(publicId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      v2.uploader.destroy(publicId, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  private uploadToCloudinary(
    file: Express.Multer.File,
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {
      if (!file.mimetype.startsWith('image')) {
        reject(new Error('Sorry, this file is not an image, please try again'));
        return;
      }

      const upload = v2.uploader.upload_stream(
        { folder: 'noslag' },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        },
      );
      toStream(file.buffer).pipe(upload);
    });
  }
}
