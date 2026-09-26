import type { CSSProperties } from "react";

import type { TaskCategoryDefinition } from "@/lib/types";

export const uncategorizedTaskCategory: TaskCategoryDefinition = {
  id: "",
  title: "Без группы",
  icon: "◌",
  color: "#8b91a8",
  position: Number.MAX_SAFE_INTEGER,
  createdAt: "",
  updatedAt: ""
};

export function getTaskCategory(categories: TaskCategoryDefinition[], categoryId?: string) {
  return categories.find((category) => category.id === categoryId) ?? uncategorizedTaskCategory;
}

export function taskCategoryStyle(category: TaskCategoryDefinition): CSSProperties {
  return { "--task-category-color": category.color } as CSSProperties;
}
