import { createFileRoute, notFound } from "@tanstack/react-router";

import { PropertyPage } from "../components/agentforge/PropertyPage";
import { getPublicListing } from "../lib/agentforge/functions";

export const Route = createFileRoute("/home/$listingId")({
  loader: async ({ params }) => {
    const res = await getPublicListing({ data: { id: params.listingId } });
    if (!res.listing) throw notFound();
    return res;
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.listing
          ? `${loaderData.listing.address}, ${loaderData.listing.city} · Leslie Smith`
          : "Property · ListingDesk",
      },
      {
        name: "description",
        content: loaderData?.listing
          ? `${loaderData.listing.beds} bed, ${loaderData.listing.baths} bath in ${loaderData.listing.city}. ${loaderData.listing.features}`
          : "",
      },
    ],
  }),
  component: PublicPropertyPage,
});

function PublicPropertyPage() {
  const { listing, owner, videoUrl } = Route.useLoaderData();
  if (!listing) return null;
  return <PropertyPage listing={listing} owner={owner} videoUrl={videoUrl} />;
}
