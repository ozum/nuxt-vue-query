import { readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";

/**
 * Reads file paths recursively.
 */
export default async function readdirRecursive(
  path: string,
  { base = path, exclude = [] }: { base?: string; exclude?: string[] } = {} as any
): Promise<string[]> {
  if (exclude.some((excluded) => path.startsWith(join(base, excluded)))) return [];

  try {
    const filesInDirectory = await readdir(path);
    const files = await Promise.all(
      filesInDirectory.map(async (file) => {
        const filePath = join(path, file);
        return (await stat(filePath)).isDirectory() ? readdirRecursive(filePath, { base, exclude }) : join("/", relative(base, filePath));
      })
    );
    return files.flat();
  } catch (error: any) {
    if (error.code !== "ENOENT") throw error;
    return [];
  }
}
