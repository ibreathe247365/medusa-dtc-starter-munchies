import type {PageProps} from "@/types";

import SectionsRenderer from "@/components/sections/section-renderer";
import {getProductByHandle} from "@/data/medusa/products";
import {getRegion} from "@/data/medusa/regions";
import {loadProductContent} from "@/data/sanity";
import {notFound} from "next/navigation";

import {ProductImagesCarousel} from "./_parts/image-carousel";
import ProductInformation from "./_parts/product-information";

type ProductPageProps = PageProps<"handle">;

export default async function ProductPage({params}: ProductPageProps) {
  const region = await getRegion(
    // TODO: Make this come from the params
    process.env.NEXT_PUBLIC_MEDUSA_DEFAULT_COUNTRY_CODE!,
  );

  if (!region) {
    console.log("No region found");
    return notFound();
  }

  const product = await getProductByHandle(params.handle, region.id);

  const content = await loadProductContent(params.handle);

  if (!product) {
    console.log("No product found");
    return notFound();
  }
  return (
    <>
      <section className="mx-auto flex max-w-max-screen flex-col items-start justify-start gap-s lg:flex-row lg:gap-xs lg:px-xl lg:py-m">
        <ProductImagesCarousel product={product} />
        <ProductInformation
          content={content}
          region_id={region.id}
          {...product}
        />
      </section>
      {content?.sections && (
        <SectionsRenderer fieldName="body" sections={content.sections} />
      )}
    </>
  );
}
