// src/app/api/projects/route.ts
import { writeClient, client } from "@/lib/sanity";
import { logSanityInteraction } from "@/lib/sanityLogger";
import { groq } from "next-sanity";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic'; // Add this line at the top

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const title = formData.get('title')?.toString();
    const tagline = formData.get('tagline')?.toString();
    const descriptionJson = formData.get('description')?.toString(); // Portable Text
    const technologiesUsedJson = formData.get('technologiesUsed')?.toString(); // Array of strings
    const projectDate = formData.get('projectDate')?.toString(); // Date string
    const mainImageFile = formData.get('mainImage') as File | null;

    if (!title || !tagline || !descriptionJson || !technologiesUsedJson || !projectDate) {
      return NextResponse.json({ message: 'Missing required fields (title, tagline, description, technologiesUsed, projectDate)' }, { status: 400 });
    }

    let description: any[] = [];
    try {
      description = JSON.parse(descriptionJson);
      if (!Array.isArray(description)) {
        throw new Error('Invalid description format (expected array of Portable Text blocks).');
      }
    } catch (parseError: any) {
      return NextResponse.json({ message: `Invalid description format: ${parseError.message}` }, { status: 400 });
    }

    let technologiesUsed: string[] = [];
    try {
      technologiesUsed = JSON.parse(technologiesUsedJson);
      if (!Array.isArray(technologiesUsed) || technologiesUsed.some(tech => typeof tech !== 'string')) {
        throw new Error('Invalid technologiesUsed format (expected array of strings).');
      }
    } catch (parseError: any) {
      return NextResponse.json({ message: `Invalid technologiesUsed format: ${parseError.message}` }, { status: 400 });
    }

    let imageUrl: string | undefined;
    let imageAssetRef: string | undefined;

    if (mainImageFile) {
      try {
        const imageAsset = await writeClient.assets.upload('image', mainImageFile, {
          filename: mainImageFile.name,
        });
        imageUrl = imageAsset.url;
        imageAssetRef = imageAsset._ref;
      } catch (uploadError: any) {
        await logSanityInteraction('error', `Failed to upload project main image: ${uploadError.message}`, 'project', undefined, 'admin', false, { errorDetails: uploadError.message });
        return NextResponse.json({ message: `Failed to upload image: ${uploadError.message}` }, { status: 500 });
      }
    }

    const newProject = {
      _type: 'project',
      title,
      slug: {
        _type: 'slug',
        current: title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, ''),
      },
      tagline,
      description,
      technologiesUsed,
      projectDate,
      mainImage: imageAssetRef ? {
        _type: 'image',
        asset: {
          _ref: imageAssetRef,
          _type: 'reference',
        },
      } : undefined,
    };

    const createdDocument = await writeClient.create(newProject);

    await logSanityInteraction('create', `Created new project: ${title}`, 'project', createdDocument._id, 'admin', true, { payload: newProject });

    return NextResponse.json(createdDocument, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/projects:', error);
    let errorMessage = 'Failed to create project.';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null && 'message' in error) {
      errorMessage = (error as any).message;
    }
    await logSanityInteraction('error', `Failed to create project: ${errorMessage}`, 'project', undefined, 'admin', false, { errorDetails: errorMessage, payload: req.body });

    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
    try {
        const projects = await client.fetch(groq`*[_type == "project"]{
            _id,
            title,
            slug,
            mainImage,
            tagline,
            description,
            technologiesUsed,
            projectDate
        } | order(projectDate desc, _createdAt desc)`);

        await logSanityInteraction('fetch', 'Fetched all projects for dashboard revalidation.', 'project', undefined, 'system', true);

        return NextResponse.json(projects, { status: 200 });
    } catch (error: any) {
        console.error('Error in GET /api/projects:', error);
        let errorMessage = 'Failed to fetch projects.';
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'object' && error !== null && 'message' in error) {
            errorMessage = (error as any).message;
        }
        await logSanityInteraction('error', `Failed to fetch projects: ${errorMessage}`, 'project', undefined, 'system', false, { errorDetails: errorMessage });
        return NextResponse.json({ message: errorMessage }, { status: 500 });
    }
}
