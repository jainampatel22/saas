import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary, UploadStream } from 'cloudinary';
import { auth } from '@clerk/nextjs/server';
import { stat } from 'fs';
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()
cloudinary.config({
    cloud_name: 'dk5whjlim',
    api_key: '363827864547742',
    api_secret: 'process.env.CLOUDINARY_API_SECRET' // Click 'View API Keys' above to copy your API secret
});
interface CloudinaryUploadResponse {
    public_id: string;
    [key: string]: any;
    bytes: number;
    duration?: number;
}
export async function POST(request: NextRequest) {
    const { userId } = auth();
    if (!userId) {
        return NextResponse.json({ error: "You need to be logged in to upload a video" }, { status: 401 })
    }
    try {

        const formdata = await request.formData();
        const file = formdata.get('file') as File | null;
        const title = formdata.get('title') as string;
        const description = formdata.get('description') as string;
        const originalSize = formdata.get('originalSize') as string;
        if (!file) {
            return NextResponse.json({ error: "No file found" }, { status: 400 })
        }
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes);
        const result = await new Promise<CloudinaryUploadResponse>((resolve, reject) => {

            const uploadStream = cloudinary.uploader.upload_stream({
                folder: "video-cloudinary-uploads",
                resource_type: "video",
                transformation: [
                    {
                        quality: "auto",
                        fetch_format: "mp4",
                    }
                ]
            }, ((error, result) => {
                if (error) {
                    reject(error)
                }
                else resolve(result as CloudinaryUploadResponse)
            }))
            uploadStream.end(buffer)
        })
       const video = await prisma .video.create({
           data:{
               title,
               description,
               publicId: result.public_id,
               originalSize: originalSize,
               compressedSize:String(result.bytes),
               duration:result.duration||0,
              
           }
       })
       return NextResponse.json({message:"Video uploaded successfully",video:video}
           ,{status:200})
    } catch (error) {
        console.log("upload failed")
    }
    finally{
        await prisma.$disconnect()
    }
}