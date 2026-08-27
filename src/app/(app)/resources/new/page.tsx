import { db } from "@/db";
import { regions } from "@/db/schema";
import { ResourceForm } from "../ResourceForm";
import { createResourceAction } from "../actions";

export default async function NewResourcePage() {
  const regionList = await db.select().from(regions).orderBy(regions.name);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">地域資源を登録</h1>
        <p className="mt-1 text-sm text-stone-500">
          「存在するもの」を登録します。体験としてどう使えるかはACTIVITY
          OPPORTUNITY（体験機会）で別途整理します。
        </p>
      </div>
      <div className="card p-6">
        <ResourceForm action={createResourceAction} regions={regionList} submitLabel="登録する" />
      </div>
    </div>
  );
}
