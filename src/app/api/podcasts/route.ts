import { NextResponse } from 'next/server';

export interface Podcast {
    id: string;
    title: string;
    category: string;
    publishedDate: string;
    summary: string;
    thumbnailUrl: string;
    audioUrl: string; // Placeholder
}

const podcasts: Podcast[] = [
    {
        id: '1',
        title: "Ep 1: The Beginning",
        category: 'General',
        publishedDate: '2025-01-01',
        summary: "Hal introduces the show and talks about high school football.",
        thumbnailUrl: 'https://placehold.co/400x400/png',
        audioUrl: 'https://example.com/audio1.mp3',
    },
    {
        id: '2',
        title: "Ep 2: The Mayor Interview",
        category: 'Politics',
        publishedDate: '2025-01-08',
        summary: "We ask the hard questions about the pothole situation on Main St.",
        thumbnailUrl: 'https://placehold.co/400x400/png',
        audioUrl: 'https://example.com/audio2.mp3',
    },
    {
        id: '3',
        title: "Ep 3: Local Legends",
        category: 'History',
        publishedDate: '2025-01-15',
        summary: "Interview with the oldest resident in town, Mrs. Gable.",
        thumbnailUrl: 'https://placehold.co/400x400/png',
        audioUrl: 'https://example.com/audio3.mp3',
    }
];

export async function GET() {
    return NextResponse.json(podcasts);
}
