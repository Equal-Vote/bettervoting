/* eslint-disable @typescript-eslint/no-require-imports -- standalone CJS script, run directly with `node` before the ts build exists */
try{
    require("@equal-vote/star-vote-shared/config");
}catch(_e){
  throw "\n\nCould not find the shared BetterVoting module. Maybe you forgot to build it? Try this...\n\n  npm run build -w @equal-vote/star-vote-shared\n\n"
}
