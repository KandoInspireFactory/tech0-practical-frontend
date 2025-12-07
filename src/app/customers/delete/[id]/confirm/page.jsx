"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ConfirmContent() {
  const searchParams = useSearchParams();
  const customer_id = searchParams.get("customer_id");

  return (
    <div className="card bordered bg-white border-blue-200 border-2 max-w-sm m-4">
      <div className="alert alert-success p-4 text-center text-white">
        {customer_id}を削除しました
      </div>
      <Link href="/customers" className="flex justify-center">
        <button className="btn btn-outline btn-accent">一覧に戻る</button>
      </Link>
    </div>
  );
}

export default function ConfirmPage(props) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConfirmContent />
    </Suspense>
  );
}
