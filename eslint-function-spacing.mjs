function getFunctionDefinition(functionNode) {
  const parentNode = functionNode.parent;

  if (functionNode.type === 'FunctionDeclaration') {
    return functionNode;
  }

  if (['MethodDefinition', 'PropertyDefinition', 'Property'].includes(parentNode.type)) {
    return parentNode;
  }

  if (parentNode.type === 'VariableDeclarator') {
    return parentNode.parent;
  }

  if (isCallbackVariable(parentNode)) {
    return parentNode.parent.parent;
  }

  if (
    parentNode.type === 'AssignmentExpression' &&
    parentNode.right === functionNode &&
    parentNode.parent.type === 'ExpressionStatement'
  ) {
    return parentNode.parent;
  }

  return null;
}

function isCallbackVariable(parentNode) {
  return (
    parentNode.type === 'CallExpression' &&
    parentNode.callee.type === 'Identifier' &&
    parentNode.callee.name === 'useCallback' &&
    parentNode.parent.type === 'VariableDeclarator'
  );
}

const blankLineBeforeFunction = {
  meta: {
    type: 'layout',
    fixable: 'whitespace',
    schema: [],
    messages: { missingBlankLine: 'Expected a blank line before this function.' },
  },

  create(context) {
    const sourceCode = context.sourceCode;

    function checkFunctionSpacing(functionNode) {
      const definition = getFunctionDefinition(functionNode);

      if (!definition) {
        return;
      }

      const declaration = definition.parent.type.startsWith('Export')
        ? definition.parent
        : definition;
      const leadingComment = sourceCode
        .getCommentsBefore(declaration)
        .find((comment) =>
          /^\s*$/.test(
            sourceCode.lines[comment.loc.start.line - 1].slice(
              0,
              comment.loc.start.column,
            ),
          ),
        );
      const firstToken = leadingComment ?? sourceCode.getFirstToken(declaration);
      const previousToken = sourceCode.getTokenBefore(firstToken, {
        includeComments: true,
      });

      if (!previousToken || previousToken.value === '{') {
        return;
      }

      const lineDistance = firstToken.loc.start.line - previousToken.loc.end.line;

      if (lineDistance >= 2) {
        return;
      }

      context.report({
        node: declaration,
        messageId: 'missingBlankLine',

        fix: (fixer) =>
          fixer.insertTextAfter(previousToken, '\n'.repeat(2 - lineDistance)),
      });
    }

    return {
      FunctionDeclaration: checkFunctionSpacing,
      FunctionExpression: checkFunctionSpacing,
      ArrowFunctionExpression: checkFunctionSpacing,
    };
  },
};

export default blankLineBeforeFunction;
