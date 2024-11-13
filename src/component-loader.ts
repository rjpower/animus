import { Parser } from "acorn";
import jsx from "acorn-jsx";
import * as walk from "acorn-walk";
import { transform } from "sucrase";
import * as React from "react";
import type { ComponentType } from "react";
import * as Mantine from "@mantine/core";

// Define allowed module registries
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

interface ImportSpecifier {
  type: string;
  local: { name: string };
  imported?: { name: string };
}

interface ImportDeclaration {
  type: "ImportDeclaration";
  specifiers: ImportSpecifier[];
  source: { value: string };
}

function isImportDeclaration(node: any): node is ImportDeclaration {
  return node.type === "ImportDeclaration";
}

export function compileComponent(code: string): ComponentType<any> {
  console.log(code);
  if (code === "") {
    return () => null;
  }

  const { code: transformedCode } = transform(code, {
    transforms: ["jsx", "imports"],
    jsxRuntime: "classic",
    production: true,
  });

  // Parse the transformed code
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
      if (!registries[source as keyof typeof registries]) {
        console.warn(`Skipping import from unauthorized module: ${source}`);
        return;
      }
      if (!moduleImports.has(source)) {
        moduleImports.set(source, new Set());
      }
      node.specifiers.forEach((spec: any) => {
        const name = spec.local.name;
        moduleImports.get(source)!.add(name);
      });
    },
  });

  // Clean the transformed code
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
    
    if (!exports.default) {
      throw new Error('No default export found in component');
    }
    return exports.default;
  `;

  console.log(wrappedCode);

  const factory = new Function("require", "React", wrappedCode);
  const require = (module: string) => {
    return registries[module as keyof typeof registries];
  };
  return factory(require, React);
}

export function useCompiledComponent(code: string) {
  return React.useMemo(() => compileComponent(code), [code]);
}
