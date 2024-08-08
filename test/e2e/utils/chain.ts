export function getSlugFromChainName(chainName: string): string {
  return chainName.toLowerCase().replace(/\s/g, "-");
}
