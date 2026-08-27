"use client";

import { useState } from "react";
import type { FormValues } from "./form-state";

/**
 * バリデーションエラー等でuseActionStateのstateが更新されるたびにフォームを再マウントするためのkeyを返す。
 * 再マウント時にstate.valuesを defaultValue に反映させれば、送信済みの入力内容を保持したまま
 * エラーメッセージだけを表示できる（React 19のフォームアクション自動リセット対策）。
 *
 * 「レンダー中に前回値と比較してsetStateする」公式パターン（React docs: You Might Not Need
 * an Effect）を使用している。前回値の保持にはuseRefではなくuseStateを使う点がポイントで、
 * refはレンダー中に読み書きしてはいけないため、代わりにstateとして保持している。
 * これによりuseEffect内でのsetState（カスケードレンダーの原因になる）も避けられる。
 */
export function useRetryFormKey(state: unknown) {
  const [formKey, setFormKey] = useState(0);
  const [prevState, setPrevState] = useState(state);
  if (prevState !== state && state !== undefined) {
    setPrevState(state);
    setFormKey((k) => k + 1);
  }
  return formKey;
}

export function strValue(values: FormValues | undefined, key: string, fallback = ""): string {
  const v = values?.[key];
  return typeof v === "string" ? v : fallback;
}

export function arrValue(values: FormValues | undefined, key: string, fallback: string[] = []): string[] {
  const v = values?.[key];
  return Array.isArray(v) ? v : fallback;
}
