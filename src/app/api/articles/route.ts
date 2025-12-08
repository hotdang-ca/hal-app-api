import { NextResponse } from 'next/server';

export interface Article {
    id: string;
    title: string;
    category: string;
    publishedDate: string;
    summary: string;
    content: string; // Markdown
}

const articles: Article[] = [
    {
        id: '1',
        title: "Why You Should Visit the Old Mill",
        category: 'Local History',
        publishedDate: '2025-05-12',
        summary: "A deep dive into our town's oldest structure.",
        content: `
# The Old Mill
The Old Mill has stood since **1854**. It's a testament to the industrial spirit of our founders.

## Things to see
- The Water Wheel
- The Miller's House
- The ghost in the attic (maybe?)

## Conclusion
It's a great spot for a Sunday picnic.
    `,
    },
    {
        id: '2',
        title: "Top 5 Burgers in Town",
        category: 'Food',
        publishedDate: '2025-05-20',
        summary: "I ate way too much beef for this article.",
        content: `
# The Burger List

1. **Joe's Garage** - The "Grease Monkey" is to die for.
2. **The Diner** - Classic smash burger.
3. **Fancy Bistro** - Truffle oil and arugula, if you're into that.

*Honorable Mention*: That food truck by the park.
    `,
    }
];

export async function GET() {
    return NextResponse.json(articles);
}
