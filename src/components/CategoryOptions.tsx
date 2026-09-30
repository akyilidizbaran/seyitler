import { CATEGORIES, CATEGORY_GROUPS } from "@/lib/types";

/** Kategori <select>'i için gruplanmış seçenekler (Kariyer / Akademik / Gelişim). */
export function CategoryOptions() {
  return CATEGORY_GROUPS.map((g) => (
    <optgroup key={g.label} label={g.label}>
      {g.items.map((c) => (
        <option key={c} value={c}>
          {CATEGORIES[c]}
        </option>
      ))}
    </optgroup>
  ));
}
