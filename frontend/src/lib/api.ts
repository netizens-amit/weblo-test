import { apiInstance } from "./axios";

export const getJobStatus = async (projectId: string) => {
    const response = await apiInstance.get(`/projects/${projectId}/job-status`);
    return response.data;
};