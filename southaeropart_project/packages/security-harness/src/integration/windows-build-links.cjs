// Scoped to the isolated Next build. Windows junctions preserve directory links
// without requiring the host's Developer Mode or changing global privileges.
const fs = require("node:fs");
const path = require("node:path");
const symlink = fs.promises.symlink.bind(fs.promises);
if (process.platform === "win32") {
  fs.promises.symlink = async (target, link, type) => {
    try {
      return await symlink(target, link, type);
    } catch (error) {
      if (error.code !== "EPERM") throw error;
      const resolved = path.resolve(path.dirname(link), target);
      if ((await fs.promises.stat(resolved)).isDirectory()) {
        return symlink(resolved, link, "junction");
      }
      return fs.promises.copyFile(resolved, link, fs.constants.COPYFILE_EXCL);
    }
  };
}
