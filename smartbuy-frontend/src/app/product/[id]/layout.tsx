import type { Metadata } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await fetch(`${API_URL}/api/products/${id}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error("Not found");
    const data = await res.json();
    const product = data.product;
    const priceCount = data.prices?.length || 0;

    const title = `${product.name} — Best Price Comparison | SmartBuy`;
    const description = `Compare prices for ${product.name} across ${priceCount} platforms. Find the lowest price and save money.`;
    const image = product.image_url || `${SITE_URL}/og-default.png`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `${SITE_URL}/product/${id}`,
        siteName: "SmartBuy",
        images: [{ url: image, width: 1200, height: 630, alt: product.name }],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [image],
      },
    };
  } catch {
    return {
      title: "Product Price Comparison | SmartBuy",
      description: "Compare prices across Amazon, Flipkart, Croma and more.",
    };
  }
}

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
