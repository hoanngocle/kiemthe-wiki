import instances from "../docs/wiki-events-instances.json";
import competition from "../docs/wiki-events-competition.json";
import daily from "../docs/wiki-events-daily.json";

export type ActivityCategory = "doi-khang" | "pho-ban" | "thu-thap" | "nhiem-vu" | "che-tao";
export type ActivityStatus = "implemented" | "issues" | "info" | "unclear";
export type Activity = {
  id: string;
  title: string;
  category: ActivityCategory;
  summary: string;
  schedule: string;
  timings: { label: string; when: string; detail: string }[];
  entry: string[];
  steps: string[];
  mechanics: { title: string; description: string }[];
  rewards: { title: string; detail: string }[];
  limits: string[];
  issues: string[];
  status: ActivityStatus;
  verdict: string;
  sources: { path: string; line: number; label: string }[];
};

export const activityCategories: Record<ActivityCategory, string> = {
  "doi-khang": "Thi đấu và tranh đoạt",
  "pho-ban": "Phó bản",
  "thu-thap": "Thu thập và tích lũy",
  "nhiem-vu": "Nhiệm vụ",
  "che-tao": "Trồng cây và chế tạo",
};

export const activityStatusLabels: Record<ActivityStatus, string> = {
  implemented: "Có xử lý trong mã",
  issues: "Có điểm cần kiểm tra",
  info: "Menu giới thiệu",
  unclear: "Chưa rõ điều kiện mở",
};

export const activities = [...instances, ...competition, ...daily] as Activity[];

export function filterActivities(query: string, category: ActivityCategory | "all") {
  const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase();
  const phrase = normalize(query).trim().replace(/\s+/g, " ");
  return activities.filter((activity) => (category === "all" || activity.category === category)
    && normalize(`${JSON.stringify(activity)} ${activityCategories[activity.category]}`).includes(phrase));
}
