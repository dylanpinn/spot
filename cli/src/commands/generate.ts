import { Command, flags } from "@oclif/command";
import * as fs from "fs-extra";
import * as path from "path";
import { generateJsonSchema } from "../../../lib/src/generators/contract/json-schema";
import { generateOpenApiV3 } from "../../../lib/src/generators/contract/openapi-3";
import { generateAxiosClientSource } from "../../../lib/src/generators/typescript/axios-client";
import {
  generateEndpointHandlerSource,
  generateExpressServerSource
} from "../../../lib/src/generators/typescript/express-server";
import { generateTypesSource } from "../../../lib/src/generators/typescript/types";
import { generateValidatorsSource } from "../../../lib/src/generators/typescript/validators";
import { parsePath } from "../../../lib/src/parser";

export default class Generate extends Command {
  static description = "describe the command here";

  static examples = [
    `$ api generate --language typescript --generator axios-client --out src/
Generated the following files:
- src/types.ts
- src/validators.ts
- src/client.ts
`
  ];

  static flags = {
    help: flags.help({ char: "h" }),
    api: flags.string({
      required: true,
      char: "a",
      description: "Path to a TypeScript API definition"
    }),
    language: flags.string({
      required: true,
      char: "l",
      description: "Language to generate"
    }),
    generator: flags.string({
      required: true,
      char: "g",
      description: "Generator to run"
    }),
    out: flags.string({
      required: true,
      char: "o",
      description: "Directory in which to output generated files"
    })
  };

  async run() {
    const { flags } = this.parse(Generate);
    const { api: apiPath, language, generator, out: outDir } = flags;
    const api = await parsePath(apiPath);
    const generatedFiles: {
      [relativePath: string]: string;
    } = {};
    switch (generator) {
      case "json-schema":
        switch (language) {
          case "json":
            generatedFiles["types.json"] = generateJsonSchema(api, "json");
            break;
          case "yaml":
            generatedFiles["types.yaml"] = generateJsonSchema(api, "yaml");
            break;
          default:
            this.error(
              `Unsupported language for generator ${generator}: ${language}`
            );
            this.exit(1);
        }
        break;
      case "openapi-3":
        switch (language) {
          case "json":
            generatedFiles["api.json"] = generateOpenApiV3(api, "json");
            break;
          case "yaml":
            generatedFiles["api.yaml"] = generateOpenApiV3(api, "yaml");
            break;
          default:
            this.error(
              `Unsupported language for generator ${generator}: ${language}`
            );
            this.exit(1);
        }
        break;
      case "axios-client":
        switch (language) {
          case "typescript":
            generatedFiles["types.ts"] = generateTypesSource(api);
            generatedFiles["validators.ts"] = generateValidatorsSource(api);
            generatedFiles["client.ts"] = generateAxiosClientSource(api);
            break;
          default:
            this.error(
              `Unsupported language for generator ${generator}: ${language}`
            );
            this.exit(1);
        }
        break;
      case "express-server":
        switch (language) {
          case "typescript":
            generatedFiles["types.ts"] = generateTypesSource(api);
            generatedFiles["validators.ts"] = generateValidatorsSource(api);
            generatedFiles["server.ts"] = generateExpressServerSource(api);
            for (const [endpointName, endpoint] of Object.entries(
              api.endpoints
            )) {
              generatedFiles[
                `endpoints/${endpointName}.ts`
              ] = generateEndpointHandlerSource(api, endpointName, endpoint);
            }
            break;
          default:
            this.error(
              `Unsupported language for generator ${generator}: ${language}`
            );
            this.exit(1);
        }
        break;

      default:
        this.error(`Unsupported generator: ${generator}`);
        this.exit(1);
    }
    for (const [relativePath, content] of Object.entries(generatedFiles)) {
      outputFile(outDir, relativePath, content);
    }
    this.log(`Generated the following files:`);
    Object.keys(generatedFiles).forEach(relativePath =>
      this.log(`- ${path.join(outDir, relativePath)}`)
    );
  }
}

function outputFile(outDir: string, relativePath: string, content: string) {
  const destinationPath = path.join(outDir, relativePath);
  fs.mkdirpSync(path.dirname(destinationPath));
  fs.writeFileSync(destinationPath, content, "utf8");
}
