// Parses a component definition created by an LLM and returns a React
// component.  This handles transforming import & export statements into
// something that can be evaluated in a runtime context. We export all React &
// Mantine components as well as any user specified context.
//
// There's probably a much better way to do this, but... this works for now.

import { Parser } from "acorn";
import jsx from "acorn-jsx";
import * as walk from "acorn-walk";
import { transform } from "sucrase";
import * as React from "react";
import type { ComponentType } from "react";
import * as Mantine from "@mantine/core";
import { createLogger } from "./logging";

const logger = createLogger("ComponentLoader");

// Define allowed module imports
const registries = {
  "@mantine/core": Mantine,
  react: {
    useState: React.useState,
    useEffect: React.useEffect,
    useCallback: React.useCallback,
    useMemo: React.useMemo,
    useRef: React.useRef,
    createElement: React.createElement,
    Fragment: React.Fragment,
  },
} as const;

const JSXParser = Parser.extend(jsx());

export function compileComponent({
  code,
  userCtx,
}: {
  code: string;
  userCtx: object;
}): ComponentType<any> {
  try {
    logger.debug(code);
    if (code === "") {
      return () => null;
    }

    // Convert JSX to React.createElement
    const { code: transformedCode } = transform(code, {
      transforms: ["jsx", "imports"],
      jsxRuntime: "classic",
      production: true,
    });

    const ast = JSXParser.parse(transformedCode, {
      sourceType: "module",
      ecmaVersion: "latest",
    });

    // Track imports by module
    const moduleImports = new Map<string, Set<string>>();

    // Walk the AST to gather imports
    walk.simple(ast as any, {
      ImportDeclaration(node: any) {
        const source = node.source.value;
        if (!moduleImports.has(source)) {
          moduleImports.set(source, new Set());
        }
        for (const spec of node.specifiers) {
          const name = spec.local.name;
          moduleImports.get(source)!.add(name);
        }
      },
    });

    // Strip imports and outputs from the transformed code
    const cleanCode = transformedCode
      .replace(/import.*from.*;\n/g, "")
      .replace(/export\s+(function|const|let|var|class)/g, "$1");

    // Build the scope declarations
    const scopeDeclarations = Array.from(moduleImports.entries())
      .map(([module, imports]) => {
        const alias = module === "@mantine/core" ? "Mantine" : module;
        return `const { ${Array.from(imports).join(", ")} } = ${alias};`;
      })
      .join("\n");

    // Create the wrapped code with proper scope and exports handling
    const wrappedCode = `
      ${scopeDeclarations}
      const exports = {};
      const _jsx = React.createElement;
      
      ${cleanCode}
      
      if (exports.default) {
        return exports.default;
      }
      
      const exportKeys = Object.keys(exports);
      if (exportKeys.length === 0) {
        throw new Error('No exports found in component');
      }
      if (exportKeys.length === 1) {
        return exports[exportKeys[0]];
      }
      throw new Error('Multiple exports found: ' + exportKeys.join(', '));
    `;

    logger.debug(wrappedCode);

    const require = (module: string) => {
      return registries[module as keyof typeof registries];
    };

    const ctx = { React, require, ...userCtx };
    const ctxKeys = Object.keys(ctx);
    const ctxValues = Object.values(ctx);
    const factory = new Function(...ctxKeys, wrappedCode);
    return factory(...ctxValues);
  } catch (error) {
    logger.error("Input code:", code);
    logger.error("Exception trace:", error);
    throw error;
  }
}