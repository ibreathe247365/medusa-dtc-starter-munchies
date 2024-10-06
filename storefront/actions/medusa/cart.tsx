"use server";
import type {HttpTypes} from "@medusajs/types";

import client from "@/data/medusa/client";
import {
  getAuthHeaders,
  getCacheHeaders,
  getCacheTag,
  getCartId,
  setCartId,
} from "@/data/medusa/cookies";
import {getCustomer} from "@/data/medusa/customer";
import {getRegion} from "@/data/medusa/regions";
import medusaError from "@/utils/medusa/error";
import {revalidateTag} from "next/cache";

export async function retrieveCart() {
  const cartId = getCartId();

  if (!cartId) {
    return null;
  }

  return await client.store.cart
    .retrieve(
      cartId,
      {
        fields:
          "+items, +region, +items.product.*, +items.variant.*, +items.thumbnail, +items.metadata, +promotions.*,",
      },
      {...getAuthHeaders(), ...getCacheHeaders("carts")},
    )
    .then(
      ({cart}) =>
        cart as {
          promotions?: HttpTypes.StorePromotion[];
        } & HttpTypes.StoreCart,
    )
    .catch(() => {
      return null;
    });
}

export async function getOrSetCart(countryCode: string) {
  let cart = await retrieveCart();
  const region = await getRegion(countryCode);
  const customer = await getCustomer();

  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`);
  }

  if (!cart) {
    const body = {
      email: customer?.email,
      region_id: region.id,
    };

    const cartResp = await client.store.cart.create(body, {}, getAuthHeaders());
    setCartId(cartResp.cart.id);
    revalidateTag(getCacheTag("carts"));

    cart = await retrieveCart();
  }

  if (cart && cart?.region_id !== region.id) {
    await client.store.cart.update(
      cart.id,
      {region_id: region.id},
      {},
      getAuthHeaders(),
    );
    revalidateTag(getCacheTag("carts"));
  }

  return cart;
}

export async function addToCart({
  countryCode = "us",
  quantity,
  variantId,
}: {
  countryCode?: string;
  quantity: number;
  variantId: string;
}) {
  if (!variantId) {
    throw new Error("Missing variant ID when adding to cart");
  }

  const cart = await getOrSetCart(countryCode);

  if (!cart) {
    throw new Error("Error retrieving or creating cart");
  }

  await client.store.cart
    .createLineItem(
      cart.id,
      {
        quantity,
        variant_id: variantId,
      },
      {},
      getAuthHeaders(),
    )
    .then(() => {
      revalidateTag(getCacheTag("carts"));
    })
    .catch(medusaError);
}
