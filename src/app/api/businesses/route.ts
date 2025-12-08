import { NextResponse } from 'next/server';

export interface Business {
    id: string;
    name: string;
    category: string;
    address: string;
    phone: string;
    website: string;
    summary: string;
    description: string;
    imageUrl?: string;
}

const businesses: Business[] = [
    {
        id: '1',
        name: "Joe's Garage",
        category: 'Automotive',
        address: '123 Main St, Anytown',
        phone: '555-0101',
        website: 'https://joesgarage.mock',
        summary: "Best mechanic in town. Won't rip you off.",
        description: "Joe has been fixing cars for 30 years. He specifies in foreign imports but handles everything effectively. Free coffee in the waiting room.",
        imageUrl: 'https://placehold.co/600x400/png',
    },
    {
        id: '2',
        name: "Sal's Pizza",
        category: 'Dining',
        address: '456 Elm St, Anytown',
        phone: '555-0102',
        website: 'https://salspersonalpizza.mock',
        summary: "Authentic NY style slices. Ask for the 'Grandma Slice'.",
        description: "Sal moved here from Brooklyn in '95 and brought the water with him (allegedly). Best crust in the tri-state area.",
        imageUrl: 'https://placehold.co/600x400/png',
    },
    {
        id: '3',
        name: "The Book Nook",
        category: 'Retail',
        address: '789 Oak Ave, Anytown',
        phone: '555-0103',
        website: 'https://booknook.mock',
        summary: "Quiet place to find rare editions.",
        description: "A cozy bookstore with a cat named Hemingway. They have a great selection of local authors and vintage maps.",
        imageUrl: 'https://placehold.co/600x400/png',
    },
    {
        id: '4',
        name: "Elite Plumbing",
        category: 'Services',
        address: '101 Pine Ln, Anytown',
        phone: '555-0104',
        website: 'https://eliteplumbing.mock',
        summary: "Fast response time, but pricey.",
        description: "When you have a leak at 2AM, these are the guys to call. They charge a premium for emergency service but they get it done right.",
        imageUrl: 'https://placehold.co/600x400/png',
    },
    {
        id: '5',
        name: "Green Thumb Nursery",
        category: 'Retail',
        address: '202 Maple Dr, Anytown',
        phone: '555-0105',
        website: 'https://greenthumb.mock',
        summary: "Ask for Sarah, she knows everything about orchids.",
        description: "Huge selection of native plants and exotic flowers. They also offer landscape design services.",
        imageUrl: 'https://placehold.co/600x400/png',
    }
];

export async function GET() {
    return NextResponse.json(businesses);
}
