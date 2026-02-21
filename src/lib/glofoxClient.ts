interface GlofoxFetchParams {
  startDate: Date;
  endDate: Date;
  token: string;
  branchId: string;
  timezone: string;
}

export const glofoxClient = {
  async fetchSessions(_params: GlofoxFetchParams): Promise<unknown[]> {
    throw new Error('Glofox integration not yet configured');
  },
};
