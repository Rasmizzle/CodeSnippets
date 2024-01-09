'use client';

import { RefObject, useCallback, useEffect, useLayoutEffect, useState } from 'react';

type ColSpanRange = 2 | 3 | 4 | 6 | 8 | 9 | 12;

// Object to define hierarchy of prefixes
const prefixValues = {
  '': 0,
  'sm:': 1,
  'md:': 2,
  'lg:': 3,
  'xl:': 4,
  '2xl:': 5,
};

type PrefixKeys = keyof typeof prefixValues;

// Function to find all prefixes in the class names
function findPrefixes(matches: string[]): string[] {
  return matches?.map((match) => match.match(/([a-zA-Z]+:)/g)?.toString() as PrefixKeys) ?? [''];
}

// Function to find the biggest prefix in the class names
// we assume that the biggest prefix is used for the biggest screen
function findBiggestPrefix(prefixes: string[]): string {
  const biggestPrefix = prefixes.reduce(
    (biggest, prefix) => (prefixValues[prefix as PrefixKeys] > prefixValues[biggest as PrefixKeys] ? prefix : biggest),
    ''
  );
  // If the biggest prefix is for small or medium screens, default to 'xl:'
  return prefixValues[biggestPrefix as PrefixKeys] <= 2 ? 'xl:' : biggestPrefix;
}

// Function to calculate the number of grid columns in a row
function calculateGridColsInRow(matches: string[], biggestPrefix: string): number {
  const match = matches.find((match) => match.includes(biggestPrefix));
  const matchNumber = match ? Number(match.replace(/([a-zA-Z]+:)?col-span-([1-6])/g, '$2')) : 0;
  return matchNumber ? 12 / matchNumber : 0;
}

/**
 *
 * @param containerRef ref to the container
 * @param aspectRatio array of aspect ratios in grid, where 12 cols represents full grid row, default is [8, 4]
 */
const useMultiColumnChildView = (containerRef: RefObject<Element>, aspectRatio: ColSpanRange[] = [8, 4]) => {
  const [classNames, setClassNames] = useState<string[]>([]);

  const generateClassnames = useCallback(
    (prefixes: string[], biggestPrefix: string, maxCol: number = 2, currWidth: number = 12): string => {
      const classNames = prefixes?.reduce((acc, match) => {
        const matchString = match?.replace(/\s/g, '');

        if (matchString.startsWith(biggestPrefix)) {
          // skip biggest prefix, as it has own definition
          return acc;
        }

        return acc ? acc + ' ' + matchString + 'col-span-12' : matchString + String('col-span-12');
      }, '');

      const desktopClassName = maxCol > 2 ? biggestPrefix + 'col-span-12' : biggestPrefix + 'col-span-' + currWidth;

      return `${classNames} ${desktopClassName}`;
    },
    []
  );

  const selectClassnames = useCallback((container: Element): string[] => {
    if (!container.classList.contains('grid')) {
      container.classList.add('grid');
    }

    if (!container.classList.contains('grid-cols-12')) {
      container.classList.add('grid-cols-12');
    }

    const multicol = container?.closest('.multicol-column'); // find outer column

    if (!multicol) {
      return aspectRatio?.map((ratio: ColSpanRange) => {
        return `col-span-12 sm:col-span-${ratio}`;
      });
    }

    const matches = multicol.className.match(/([a-zA-Z]+:)?col-span-([1-6])(?![a-zA-Z0-9])/g); // match col-span-2 to col-span-6 with prefixes
    const prefixes = findPrefixes(matches || []);
    const biggestPrefix = findBiggestPrefix(prefixes);
    const gridColsInRow = calculateGridColsInRow(matches || [], biggestPrefix);

    return aspectRatio?.map((ratio: ColSpanRange) => {
      const classNames = generateClassnames(prefixes, biggestPrefix, gridColsInRow, ratio);
      return `col-span-12 ${classNames}`;
    });
  }, []);

  useLayoutEffect(() => {
    if (containerRef.current) {
      setClassNames(selectClassnames(containerRef.current));
    }
  }, [containerRef, selectClassnames]);

  useEffect(() => {
    if (containerRef.current) {
      const children = containerRef.current?.querySelectorAll(':scope > *'); // get all direct children

      children.forEach((child: Element, index: number) => {
        child.className += ` ${classNames[index] || ''}`;
      });
    }
  }, [classNames, containerRef]);
};

export default useMultiColumnChildView;
