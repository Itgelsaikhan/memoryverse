import { Suspense } from "react";
import CheckoutForm from "./CheckoutForm";

export const metadata = { title: "Checkout · MemoryVerse" };

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <Suspense>
        <CheckoutForm />
      </Suspense>
    </div>
  );
}
