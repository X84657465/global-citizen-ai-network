const args = process.argv.slice(2);

if (args[0] === "ls-files" && args[1] === "-z") {
  process.stdout.write(process.env.GCAN_TEST_TRACKED_DIRECTORY_COLLISION === "1" ? "README.md\0docs\0" : "README.md\0");
} else if (args[0] === "rev-parse" && args[1] === "HEAD") {
  process.stdout.write("0123456789abcdef0123456789abcdef01234567\n");
} else {
  console.error("Unsupported fixture git command: " + args.join(" "));
  process.exitCode = 2;
}
