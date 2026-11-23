import { apiRoute } from "@/core/api/route";
import { fileResponse } from "@/core/api/files";
import { toCsv } from "@/core/csv";
import { RETURN_COLUMNS, RETURN_SAMPLE } from "@/modules/payroll/bank-formats";

export const GET = apiRoute(async () => fileResponse(Buffer.from(toCsv([...RETURN_COLUMNS], RETURN_SAMPLE), "utf8"), { fileName: "bank-return-template.csv", mimeType: "text/csv" }));
