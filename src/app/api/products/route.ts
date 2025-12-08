import { NextResponse } from 'next/server';

export interface Product {
    id: string;
    name: string;
    price: number; // In cents
    description: string;
    imageUrl: string;
}

const products: Product[] = [
    {
        id: '1',
        name: "Hal's Official T-Shirt",
        price: 2500,
        description: "100% Cotton. Shows everyone you know a guy.",
        imageUrl: "https://placehold.co/400x400/png?text=T-Shirt",
    },
    {
        id: '2',
        name: "Morning Mug",
        price: 1500,
        description: "Start your day the Hal way.",
        imageUrl: "https://placehold.co/400x400/png?text=Mug",
    },
    {
        id: '3',
        name: "Sticker Pack",
        price: 500,
        description: "Stick them on your laptop, car, or forehead.",
        imageUrl: "https://placehold.co/400x400/png?text=Stickers",
    },
    {
        id: '4',
        name: "Signed Poster",
        price: 4000,
        description: "Limited edition signed poster of Hal pointing at things.",
        imageUrl: "https://placehold.co/400x400/png?text=Poster",
    }
];

export async function GET() {
    return NextResponse.json(products);
}
