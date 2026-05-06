// Fake mixed keys for testing
const openaiKey = "sk-proj-mixedTest1234567890abcdefghij";
const hfToken = "hf_fakeHuggingFaceToken1234567890abcdefgh";
const replicateToken = "r8_fakeReplicateToken1234567890";
const headers = {
  Authorization: `Bearer ${openaiKey}`,
  "x-api-key": hfToken,
};
export { openaiKey, hfToken, replicateToken, headers };
