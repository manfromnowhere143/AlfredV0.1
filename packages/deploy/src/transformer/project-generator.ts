/**
 * Project Generator - State of the Art (Three.js Fixed)
 *
 * FIXES:
 * 1. Three.js version matched to r128 (same as CDN preview)
 * 2. Shader attribute 'color' renamed to 'particleColor' to avoid conflicts
 * 3. Removed duplicate import possibilities
 */

import type {
    ParsedArtifact,
    GeneratedProject,
    ProjectFile,
  } from '../types';
  
  // ============================================================================
  // DEPENDENCY REGISTRY - Comprehensive version management
  // ============================================================================
  
  const RUNTIME_DEPS: Record<string, string> = {
    'react': '^18.3.1',
    'react-dom': '^18.3.1',
    'lucide-react': '^0.263.1',
    'recharts': '^2.12.0',
    'framer-motion': '^11.0.0',
    '@radix-ui/react-slot': '^1.0.2',
    '@radix-ui/react-dialog': '^1.0.5',
    '@radix-ui/react-dropdown-menu': '^2.0.6',
    '@radix-ui/react-popover': '^1.0.7',
    '@radix-ui/react-tooltip': '^1.0.7',
    '@radix-ui/react-tabs': '^1.0.4',
    '@radix-ui/react-accordion': '^1.1.2',
    '@radix-ui/react-switch': '^1.0.3',
    '@radix-ui/react-checkbox': '^1.0.4',
    '@radix-ui/react-select': '^2.0.0',
    '@radix-ui/react-slider': '^1.1.2',
    'class-variance-authority': '^0.7.0',
    'clsx': '^2.1.0',
    'tailwind-merge': '^2.2.0',
    // THREE.JS - Use 0.149.0 (compatible with R3F 8.x, stable before major shader changes)
    'three': '0.149.0',
    '@react-three/fiber': '^8.15.0',
    '@react-three/drei': '^9.88.0',
    'd3': '^7.8.5',
    'lodash': '^4.17.21',
    'axios': '^1.6.0',
    'zustand': '^4.5.0',
    '@tanstack/react-query': '^5.17.0',
    'mathjs': '^12.2.0',
    'date-fns': '^3.3.0',
    'react-router-dom': '^6.22.0',
    'react-hook-form': '^7.50.0',
    'zod': '^3.22.0',
    '@hookform/resolvers': '^3.3.4',
    'sonner': '^1.4.0',
    'react-hot-toast': '^2.4.1',
    'swr': '^2.2.4',
    'immer': '^10.0.3',
    'dayjs': '^1.11.10',
    'uuid': '^9.0.0',
    'nanoid': '^5.0.4',
  };
  
  const DEV_DEPS: Record<string, string> = {
    'vite': '^5.4.0',
    '@vitejs/plugin-react': '^4.3.0',
    'typescript': '^5.3.0',
    '@types/react': '^18.3.0',
    '@types/react-dom': '^18.3.0',
    '@types/three': '^0.149.0',
    '@types/lodash': '^4.14.202',
    '@types/d3': '^7.4.3',
    '@types/uuid': '^9.0.7',
    'tailwindcss': '^3.4.0',
    'autoprefixer': '^10.4.17',
    'postcss': '^8.4.33',
  };
  
  // Comprehensive list of Lucide icons used in artifacts
  const LUCIDE_ICONS = new Set([
    'Menu', 'X', 'ChevronDown', 'ChevronUp', 'ChevronLeft', 'ChevronRight',
    'Search', 'Plus', 'Minus', 'Check', 'Close', 'Settings', 'User', 'Home',
    'Mail', 'Phone', 'Calendar', 'Clock', 'Star', 'Heart', 'Share', 'Download',
    'Upload', 'Edit', 'Trash', 'Eye', 'EyeOff', 'Lock', 'Unlock', 'Sun', 'Moon',
    'Globe', 'MapPin', 'Bell', 'Camera', 'Mic', 'Play', 'Pause', 'Volume',
    'Volume2', 'VolumeX', 'Wifi', 'Bluetooth', 'Battery', 'Zap', 'Award',
    'TrendingUp', 'TrendingDown', 'BarChart', 'BarChart2', 'BarChart3',
    'PieChart', 'Activity', 'Layers', 'Grid', 'List', 'Filter', 'SortAsc',
    'SortDesc', 'RefreshCw', 'RefreshCcw', 'RotateCw', 'RotateCcw', 'Maximize',
    'Minimize', 'ExternalLink', 'Link', 'Link2', 'Copy', 'Clipboard', 'Save',
    'Folder', 'FolderOpen', 'File', 'FileText', 'Image', 'Video', 'Music',
    'Code', 'Code2', 'Terminal', 'Database', 'Server', 'Cloud', 'CloudOff',
    'Cpu', 'HardDrive', 'Monitor', 'Smartphone', 'Tablet', 'Watch', 'Headphones',
    'Speaker', 'Printer', 'Key', 'Shield', 'ShieldCheck', 'AlertCircle',
    'AlertTriangle', 'Info', 'HelpCircle', 'MessageCircle', 'MessageSquare',
    'Send', 'Inbox', 'Archive', 'Flag', 'Tag', 'Bookmark', 'Hash', 'AtSign',
    'Percent', 'DollarSign', 'CreditCard', 'ShoppingCart', 'ShoppingBag',
    'Package', 'Gift', 'Truck', 'Navigation', 'Navigation2', 'Compass', 'Map',
    'Target', 'Crosshair', 'Aperture', 'Droplet', 'Thermometer', 'Wind',
    'Umbrella', 'Sunrise', 'Sunset', 'CloudRain', 'CloudSnow', 'CloudLightning',
    'Loader', 'Loader2', 'MoreHorizontal', 'MoreVertical', 'ArrowUp', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowUpRight', 'ArrowDownLeft', 'ArrowUpLeft',
    'ArrowDownRight', 'CornerDownLeft', 'CornerDownRight', 'CornerUpLeft',
    'CornerUpRight', 'ChevronsUp', 'ChevronsDown', 'ChevronsLeft', 'ChevronsRight',
    'LogIn', 'LogOut', 'UserPlus', 'UserMinus', 'UserCheck', 'Users', 'Briefcase',
    'Building', 'Building2', 'Store', 'Sparkles', 'Wand', 'Wand2', 'Bot', 'Brain',
    'Lightbulb', 'Rocket', 'Flame', 'Crown', 'Diamond', 'Gem', 'Coins', 'Wallet',
    'Receipt', 'FileCheck', 'FilePlus', 'FileMinus', 'FileX', 'Files', 'Paperclip',
    'Pin', 'PinOff', 'Scissors', 'Pen', 'Pencil', 'Eraser', 'Highlighter',
    'PaintBucket', 'Palette', 'Pipette', 'Ruler', 'Scale', 'Shapes', 'Square',
    'Circle', 'Triangle', 'Hexagon', 'Octagon', 'Pentagon', 'Star', 'Sparkle',
    'Verified', 'BadgeCheck', 'BadgeX', 'BadgeAlert', 'BadgeInfo', 'BadgeHelp',
    'CircleCheck', 'CircleX', 'CircleAlert', 'CircleDot', 'CircleDashed',
    'SquareCheck', 'SquareX', 'CheckCircle', 'CheckCircle2', 'XCircle', 'XOctagon',
    'Ban', 'Slash', 'Power', 'PowerOff', 'ToggleLeft', 'ToggleRight', 'Sliders',
    'SlidersHorizontal', 'Gauge', 'Timer', 'TimerOff', 'TimerReset', 'Hourglass',
    'AlarmClock', 'AlarmClockOff', 'CalendarDays', 'CalendarRange', 'CalendarCheck',
    'CalendarX', 'CalendarPlus', 'CalendarMinus', 'CalendarClock', 'History',
    'Undo', 'Undo2', 'Redo', 'Redo2', 'Forward', 'Reply', 'ReplyAll', 'Share2',
    'Bookmark', 'BookmarkPlus', 'BookmarkMinus', 'BookmarkCheck', 'BookmarkX',
    'Heart', 'HeartOff', 'ThumbsUp', 'ThumbsDown', 'Smile', 'Frown', 'Meh', 'Angry',
    'Laugh', 'SmilePlus', 'Ghost', 'Skull', 'Bone', 'Footprints', 'Fingerprint',
    'Hand', 'HandMetal', 'Grab', 'Move', 'Move3D', 'Shrink', 'Expand', 'ZoomIn',
    'ZoomOut', 'Scan', 'ScanLine', 'QrCode', 'Barcode', 'Focus', 'Crosshair',
  ]);
  
  // React hooks that need to be imported
  const REACT_HOOKS = [
    'useState', 'useEffect', 'useRef', 'useMemo', 'useCallback',
    'useContext', 'useReducer', 'useLayoutEffect', 'useId', 'useImperativeHandle',
    'useDebugValue', 'useDeferredValue', 'useTransition', 'useSyncExternalStore',
    'useInsertionEffect',
  ];
  
  // ============================================================================
  // THREE.JS DETECTION - Comprehensive pattern matching
  // ============================================================================
  
  // @react-three/fiber hooks and components
  const R3F_HOOKS = [
    'useThree', 'useFrame', 'useLoader', 'useGraph', 'useTexture',
  ];
  
  const R3F_COMPONENTS = [
    'Canvas', 'useThree', 'useFrame',
  ];
  
  // @react-three/drei components and helpers
  const DREI_COMPONENTS = [
    'OrbitControls', 'PerspectiveCamera', 'OrthographicCamera', 'CameraControls',
    'TransformControls', 'PivotControls', 'DragControls', 'ScrollControls',
    'PresentationControls', 'KeyboardControls', 'FlyControls', 'MapControls',
    'TrackballControls', 'ArcballControls', 'PointerLockControls', 'FirstPersonControls',
    'Box', 'Sphere', 'Plane', 'Cylinder', 'Cone', 'Torus', 'TorusKnot', 'Ring',
    'Tetrahedron', 'Octahedron', 'Dodecahedron', 'Icosahedron', 'Extrude', 'Lathe',
    'RoundedBox', 'Capsule', 'Circle', 'Tube', 'Text', 'Text3D', 'Html', 'Billboard',
    'Stage', 'Environment', 'Sky', 'Stars', 'Cloud', 'Clouds', 'ContactShadows',
    'AccumulativeShadows', 'RandomizedLight', 'SpotLight', 'PointLight',
    'Lightformer', 'BakeShadows', 'SoftShadows', 'MeshReflectorMaterial',
    'MeshTransmissionMaterial', 'MeshDistortMaterial', 'MeshWobbleMaterial',
    'PointMaterial', 'shaderMaterial', 'Float', 'Sparkles', 'Trail', 'Line',
    'QuadraticBezierLine', 'CubicBezierLine', 'CatmullRomLine', 'Segments',
    'useGLTF', 'useFBX', 'useOBJ', 'useTexture', 'useCubeTexture', 'useVideoTexture',
    'useAnimations', 'useBVH', 'useDetectGPU', 'useAspect', 'useCamera', 'useCursor',
    'useHelper', 'useIntersect', 'useScroll', 'useSpriteLoader', 'Preload', 'Clone',
    'Center', 'Bounds', 'useBounds', 'GizmoHelper', 'GizmoViewport', 'GizmoViewcube',
    'Grid', 'Hud', 'View', 'RenderTexture', 'Mask', 'useMask', 'MeshPortalMaterial',
    'Decal', 'Shadow', 'Caustics', 'ScreenSpace', 'ScreenSizer', 'Resize',
  ];
  
  // Core Three.js patterns
  const THREE_PATTERNS = [
    /THREE\./,
    /new\s+(?:Scene|PerspectiveCamera|OrthographicCamera|WebGLRenderer)/,
    /new\s+(?:BoxGeometry|SphereGeometry|PlaneGeometry|CylinderGeometry|ConeGeometry)/,
    /new\s+(?:TorusGeometry|TorusKnotGeometry|RingGeometry|CircleGeometry|TubeGeometry)/,
    /new\s+(?:BufferGeometry|ExtrudeGeometry|LatheGeometry|ShapeGeometry)/,
    /new\s+(?:MeshBasicMaterial|MeshStandardMaterial|MeshPhongMaterial|MeshLambertMaterial)/,
    /new\s+(?:MeshNormalMaterial|MeshDepthMaterial|MeshToonMaterial|ShaderMaterial)/,
    /new\s+(?:PointsMaterial|LineBasicMaterial|LineDashedMaterial|SpriteMaterial)/,
    /new\s+(?:Mesh|Points|Line|LineSegments|LineLoop|Sprite|Group|Object3D)/,
    /new\s+(?:AmbientLight|DirectionalLight|PointLight|SpotLight|HemisphereLight)/,
    /new\s+(?:Vector2|Vector3|Vector4|Matrix3|Matrix4|Quaternion|Euler|Color)/,
    /new\s+(?:Clock|Raycaster|TextureLoader|GLTFLoader|FBXLoader|OBJLoader)/,
    /from\s+['"]three['"]/,
    /from\s+['"]@react-three\/fiber['"]/,
    /from\s+['"]@react-three\/drei['"]/,
  ];
  
  function detectThreeJS(code: string): { usesThree: boolean; usesR3F: boolean; usesDrei: boolean } {
    const result = { usesThree: false, usesR3F: false, usesDrei: false };
    
    // Check for core Three.js patterns
    for (const pattern of THREE_PATTERNS) {
      if (pattern.test(code)) {
        result.usesThree = true;
        break;
      }
    }
    
    // Check for @react-three/fiber
    for (const comp of R3F_COMPONENTS) {
      if (new RegExp(`<${comp}[\\s/>]|\\b${comp}\\b`).test(code)) {
        result.usesR3F = true;
        result.usesThree = true;
        break;
      }
    }
    for (const hook of R3F_HOOKS) {
      if (new RegExp(`\\b${hook}\\s*\\(`).test(code)) {
        result.usesR3F = true;
        result.usesThree = true;
        break;
      }
    }
    
    // Check for @react-three/drei
    for (const comp of DREI_COMPONENTS) {
      if (new RegExp(`<${comp}[\\s/>]|\\b${comp}\\b`).test(code)) {
        result.usesDrei = true;
        result.usesR3F = true;
        result.usesThree = true;
        break;
      }
    }
    
    return result;
  }
  
  // ============================================================================
  // MAIN GENERATOR
  // ============================================================================
  
  export function generateProject(
    artifact: ParsedArtifact,
    projectName: string
  ): GeneratedProject {
    const files: ProjectFile[] = [];
  
    // Prepare the component code FIRST to detect all dependencies
    const preparedCode = prepareComponentCode(artifact.code, artifact);
    const detectedDeps = detectAllDependencies(preparedCode, artifact);
  
    // Create a modified artifact with prepared code
    const preparedArtifact = { ...artifact, code: preparedCode };
  
    files.push(generatePackageJson(preparedArtifact, projectName, detectedDeps));
    files.push(generateViteConfig(preparedArtifact));
    files.push(generateIndexHtml(projectName, preparedArtifact.usesTypeScript));
    files.push(generateMainEntry(preparedArtifact));
    files.push(generateComponentFile(preparedArtifact));
    files.push(generateAppWrapper(preparedArtifact));
  
    if (artifact.usesTailwind) {
      files.push(generateTailwindConfig());
      files.push(generatePostcssConfig());
      files.push(generateGlobalCss());
    } else {
      files.push(generateBasicCss());
    }
  
    if (artifact.usesTypeScript) {
      files.push(generateTsConfig());
      files.push(generateTsConfigNode());
    }
  
    files.push(generateGitignore());
    files.push(generateNpmrc());
    files.push(generateVercelJson());
  
    return {
      files,
      framework: 'vite-react',
      buildCommand: 'npm run build',
      outputDirectory: 'dist',
      installCommand: 'npm install',
      devCommand: 'npm run dev',
    };
  }
  
  // ============================================================================
  // CODE PREPARATION - The heart of the transformation
  // ============================================================================
  
  function prepareComponentCode(code: string, artifact: ParsedArtifact): string {
    let prepared = code;
  
    // Step 1: Remove CDN-specific mock code
    prepared = removeCdnMocks(prepared);
  
    // Step 2: Fix shader attribute conflicts (color -> particleColor)
    prepared = fixShaderAttributeConflicts(prepared);
  
    // Step 3: Collect all required imports
    const imports = collectRequiredImports(prepared, artifact);
  
    // Step 4: Remove existing imports (we'll add clean ones)
    prepared = removeExistingImports(prepared);
  
    // Step 5: Build import block
    const importBlock = buildImportBlock(imports);
  
    // Step 6: Ensure default export exists
    prepared = ensureDefaultExport(prepared, artifact.componentName);
  
    // Step 7: Combine imports with code
    prepared = importBlock + '\n' + prepared;
  
    // Step 8: Clean up any double newlines and formatting
    prepared = cleanupCode(prepared);
  
    return prepared;
  }
  
  /**
   * Fix shader attribute conflicts
   * In Three.js 0.133+, 'color' is automatically provided by the shader prefix
   * when vertexColors is enabled or BufferGeometry has 'color' attribute.
   * Remove manual declarations to avoid redefinition errors.
   */
  function fixShaderAttributeConflicts(code: string): string {
    let fixed = code;
  
    // Check if code contains ShaderMaterial or custom shaders
    if (/ShaderMaterial|vertexShader|fragmentShader/.test(code)) {
      // REMOVE the 'attribute vec3 color' declaration (Three.js provides it automatically)
      // Match: attribute vec3 color; or attribute vec3 color (with various spacing)
      fixed = fixed.replace(
        /\battribute\s+(vec[234]|float)\s+color\s*;?\s*\n?/g,
        '// color attribute provided by Three.js\n'
      );
      
      // Also handle inline in template literals
      fixed = fixed.replace(
        /(['"`])([^'"`]*)\battribute\s+(vec[234]|float)\s+color\s*;?\s*([^'"`]*)\1/g,
        (_match, quote, before, _type, after) => {
          return `${quote}${before}// color attribute provided by Three.js\n${after}${quote}`;
        }
      );
    }
  
    return fixed;
  }
  
  function removeCdnMocks(code: string): string {
    let cleaned = code;
  
    // Remove motion mock object
    cleaned = cleaned.replace(
      /const\s+motion\s*=\s*\{[\s\S]*?(?:div|span|button|img|a|section|header|nav|footer|h[1-6]|p|ul|li)[\s\S]*?\};\s*\n?/g,
      ''
    );
  
    // Remove AnimatePresence mock
    cleaned = cleaned.replace(
      /const\s+AnimatePresence\s*=\s*\(\s*\{\s*children\s*\}\s*\)\s*=>\s*children\s*;?\s*\n?/g,
      ''
    );
  
    // Remove any React/ReactDOM CDN setup
    cleaned = cleaned.replace(
      /const\s*\{\s*useState[\s\S]*?\}\s*=\s*React\s*;?\s*\n?/g,
      ''
    );
  
    // Remove Three.js CDN OrbitControls mock
    cleaned = cleaned.replace(
      /THREE\.OrbitControls\s*=\s*class\s+OrbitControls[\s\S]*?dispose\s*\(\s*\)\s*\{\s*\}\s*\};\s*\n?/g,
      ''
    );
  
    // Remove any CDN script injections
    cleaned = cleaned.replace(
      /<script\s+src=["'][^"']*three[^"']*["'][^>]*>[\s\S]*?<\/script>/gi,
      ''
    );
  
    return cleaned;
  }
  
  interface ImportCollection {
    react: { default: boolean; named: Set<string> };
    reactDom: { default: boolean; named: Set<string> };
    lucide: Set<string>;
    framerMotion: Set<string>;
    recharts: Set<string>;
    three: Set<string>;
    r3f: Set<string>;
    drei: Set<string>;
    other: Map<string, { default?: string; named: Set<string> }>;
  }
  
  function collectRequiredImports(code: string, _artifact: ParsedArtifact): ImportCollection {
    const imports: ImportCollection = {
      react: { default: true, named: new Set() },
      reactDom: { default: false, named: new Set() },
      lucide: new Set(),
      framerMotion: new Set(),
      recharts: new Set(),
      three: new Set(),
      r3f: new Set(),
      drei: new Set(),
      other: new Map(),
    };
  
    // Detect React hooks
    for (const hook of REACT_HOOKS) {
      const hookRegex = new RegExp(`\\b${hook}\\b`, 'g');
      if (hookRegex.test(code)) {
        imports.react.named.add(hook);
      }
    }
  
    // Detect Lucide icons
    for (const icon of LUCIDE_ICONS) {
      const iconRegex = new RegExp(`<${icon}[\\s/>]|\\b${icon}\\b(?=\\s*[,})]|Icon)`, 'g');
      if (iconRegex.test(code)) {
        imports.lucide.add(icon);
      }
    }
  
    // Detect framer-motion usage
    if (/\bmotion\.\w+/.test(code)) {
      imports.framerMotion.add('motion');
    }
    if (/\bAnimatePresence\b/.test(code)) {
      imports.framerMotion.add('AnimatePresence');
    }
    if (/\buseAnimation\b/.test(code)) {
      imports.framerMotion.add('useAnimation');
    }
    if (/\buseMotionValue\b/.test(code)) {
      imports.framerMotion.add('useMotionValue');
    }
    if (/\buseTransform\b/.test(code)) {
      imports.framerMotion.add('useTransform');
    }
    if (/\buseSpring\b/.test(code)) {
      imports.framerMotion.add('useSpring');
    }
  
    // Detect recharts components
    const rechartsComponents = [
      'LineChart', 'BarChart', 'PieChart', 'AreaChart', 'RadarChart', 'ScatterChart',
      'ComposedChart', 'RadialBarChart', 'Treemap', 'Sankey', 'ResponsiveContainer',
      'Line', 'Bar', 'Area', 'Pie', 'Radar', 'Scatter', 'XAxis', 'YAxis', 'ZAxis',
      'CartesianGrid', 'Tooltip', 'Legend', 'Cell', 'LabelList', 'Brush', 'ReferenceLine',
      'ReferenceArea', 'ReferenceDot', 'Customized', 'Label', 'PolarGrid', 'PolarAngleAxis',
      'PolarRadiusAxis', 'RadialBar',
    ];
    for (const comp of rechartsComponents) {
      const compRegex = new RegExp(`<${comp}[\\s/>]`, 'g');
      if (compRegex.test(code)) {
        imports.recharts.add(comp);
      }
    }
  
    // Detect Three.js / @react-three/fiber / @react-three/drei
    const threeDetection = detectThreeJS(code);
    
    if (threeDetection.usesThree) {
      // Check for specific THREE.* usage
      const threeMatches = code.matchAll(/THREE\.(\w+)/g);
      for (const match of threeMatches) {
        imports.three.add(match[1]);
      }
      // If using THREE namespace, import everything
      if (imports.three.size > 0 || /import\s+\*\s+as\s+THREE/.test(code)) {
        imports.three.add('*');
      }
    }
    
    if (threeDetection.usesR3F) {
      // Detect @react-three/fiber components and hooks
      for (const comp of R3F_COMPONENTS) {
        if (new RegExp(`<${comp}[\\s/>]`).test(code)) {
          imports.r3f.add(comp);
        }
      }
      for (const hook of R3F_HOOKS) {
        if (new RegExp(`\\b${hook}\\s*\\(`).test(code)) {
          imports.r3f.add(hook);
        }
      }
    }
    
    if (threeDetection.usesDrei) {
      // Detect @react-three/drei components
      for (const comp of DREI_COMPONENTS) {
        if (new RegExp(`<${comp}[\\s/>]|\\b${comp}\\s*\\(`).test(code)) {
          imports.drei.add(comp);
        }
      }
    }
  
    // Detect other common libraries from existing imports in code
    const existingImports = code.matchAll(/import\s+(?:(\w+)\s*,?\s*)?\{?\s*([^}]*)\}?\s+from\s+['"]([^'"]+)['"]/g);
    for (const match of existingImports) {
      const source = match[3];
      if (source.startsWith('.') || source === 'react' || source === 'react-dom') continue;
      if (source === 'lucide-react' || source === 'framer-motion' || source === 'recharts') continue;
      if (source === 'three' || source === '@react-three/fiber' || source === '@react-three/drei') continue;
  
      const defaultImport = match[1];
      const namedImports = match[2]?.split(',').map(s => s.trim()).filter(Boolean) || [];
  
      if (!imports.other.has(source)) {
        imports.other.set(source, { named: new Set() });
      }
      const entry = imports.other.get(source)!;
      if (defaultImport) entry.default = defaultImport;
      namedImports.forEach(n => entry.named.add(n));
    }
  
    return imports;
  }
  
  function removeExistingImports(code: string): string {
    // Remove all import statements
    return code
      .replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
      .replace(/^import\s+['"][^'"]+['"];?\s*$/gm, '')
      .replace(/^\s*\n/gm, '') // Remove empty lines left behind
      .trim();
  }
  
  function buildImportBlock(imports: ImportCollection): string {
    const lines: string[] = [];
  
    // React import
    if (imports.react.default || imports.react.named.size > 0) {
      let reactImport = 'import React';
      if (imports.react.named.size > 0) {
        reactImport += `, { ${Array.from(imports.react.named).sort().join(', ')} }`;
      }
      reactImport += " from 'react';";
      lines.push(reactImport);
    }
  
    // Three.js imports - ONLY import once!
    if (imports.three.size > 0) {
      if (imports.three.has('*')) {
        lines.push("import * as THREE from 'three';");
      } else {
        lines.push(`import { ${Array.from(imports.three).sort().join(', ')} } from 'three';`);
      }
    }
  
    // @react-three/fiber imports
    if (imports.r3f.size > 0) {
      lines.push(`import { ${Array.from(imports.r3f).sort().join(', ')} } from '@react-three/fiber';`);
    }
  
    // @react-three/drei imports
    if (imports.drei.size > 0) {
      lines.push(`import { ${Array.from(imports.drei).sort().join(', ')} } from '@react-three/drei';`);
    }
  
    // Framer Motion
    if (imports.framerMotion.size > 0) {
      lines.push(`import { ${Array.from(imports.framerMotion).sort().join(', ')} } from 'framer-motion';`);
    }
  
    // Lucide React
    if (imports.lucide.size > 0) {
      lines.push(`import { ${Array.from(imports.lucide).sort().join(', ')} } from 'lucide-react';`);
    }
  
    // Recharts
    if (imports.recharts.size > 0) {
      lines.push(`import { ${Array.from(imports.recharts).sort().join(', ')} } from 'recharts';`);
    }
  
    // Other libraries
    for (const [source, entry] of imports.other) {
      let line = 'import ';
      if (entry.default) {
        line += entry.default;
        if (entry.named.size > 0) line += ', ';
      }
      if (entry.named.size > 0) {
        line += `{ ${Array.from(entry.named).sort().join(', ')} }`;
      }
      line += ` from '${source}';`;
      lines.push(line);
    }
  
    return lines.join('\n');
  }
  
  function ensureDefaultExport(code: string, componentName: string): string {
    // Check if default export already exists
    if (/export\s+default\s/.test(code)) {
      return code;
    }
  
    // Check if the component is exported as named and convert to default
    const namedExportRegex = new RegExp(`export\\s+(const|function|class)\\s+${componentName}\\b`);
    if (namedExportRegex.test(code)) {
      // Remove the 'export' keyword and add default export at the end
      code = code.replace(namedExportRegex, '$1 ' + componentName);
      code += `\n\nexport default ${componentName};`;
      return code;
    }
  
    // Check if component is defined but not exported
    const definitionRegex = new RegExp(`(?:const|function|class)\\s+${componentName}\\b`);
    if (definitionRegex.test(code)) {
      code += `\n\nexport default ${componentName};`;
      return code;
    }
  
    // If no component found, wrap the entire code as a component (last resort)
    return `function ${componentName}() {\n  return (\n    ${code}\n  );\n}\n\nexport default ${componentName};`;
  }
  
  function cleanupCode(code: string): string {
    return code
      .replace(/\n{3,}/g, '\n\n')  // Max 2 consecutive newlines
      .replace(/^\s+$/gm, '')       // Remove whitespace-only lines
      .trim() + '\n';
  }
  
  // ============================================================================
  // DEPENDENCY DETECTION
  // ============================================================================
  
  function detectAllDependencies(code: string, artifact: ParsedArtifact): Map<string, { version: string; isDev: boolean }> {
    const deps = new Map<string, { version: string; isDev: boolean }>();
  
    // Always include React
    deps.set('react', { version: RUNTIME_DEPS['react'], isDev: false });
    deps.set('react-dom', { version: RUNTIME_DEPS['react-dom'], isDev: false });
  
    // Detect lucide-react
    for (const icon of LUCIDE_ICONS) {
      const iconRegex = new RegExp(`<${icon}[\\s/>]`, 'g');
      if (iconRegex.test(code)) {
        deps.set('lucide-react', { version: RUNTIME_DEPS['lucide-react'], isDev: false });
        break;
      }
    }
  
    // Detect framer-motion
    if (/\bmotion\.\w+|\bAnimatePresence\b|\buseAnimation\b/.test(code)) {
      deps.set('framer-motion', { version: RUNTIME_DEPS['framer-motion'], isDev: false });
    }
  
    // Detect recharts
    if (/<(?:LineChart|BarChart|PieChart|AreaChart|ResponsiveContainer)\b/.test(code)) {
      deps.set('recharts', { version: RUNTIME_DEPS['recharts'], isDev: false });
    }
  
    // Detect Three.js and related libraries
    const threeDetection = detectThreeJS(code);
    if (threeDetection.usesThree) {
      deps.set('three', { version: RUNTIME_DEPS['three'], isDev: false });
      // Add TypeScript types for three
      if (artifact.usesTypeScript) {
        deps.set('@types/three', { version: DEV_DEPS['@types/three'], isDev: true });
      }
    }
    if (threeDetection.usesR3F) {
      deps.set('@react-three/fiber', { version: RUNTIME_DEPS['@react-three/fiber'], isDev: false });
    }
    if (threeDetection.usesDrei) {
      deps.set('@react-three/drei', { version: RUNTIME_DEPS['@react-three/drei'], isDev: false });
    }
  
    // Detect other imports
    const importMatches = code.matchAll(/from\s+['"]([^'"]+)['"]/g);
    for (const match of importMatches) {
      const pkg = getPackageName(match[1]);
      if (pkg && !pkg.startsWith('.') && RUNTIME_DEPS[pkg] && !deps.has(pkg)) {
        deps.set(pkg, { version: RUNTIME_DEPS[pkg], isDev: false });
      }
    }
  
    // Tailwind deps
    if (artifact.usesTailwind) {
      deps.set('tailwindcss', { version: DEV_DEPS['tailwindcss'], isDev: true });
      deps.set('autoprefixer', { version: DEV_DEPS['autoprefixer'], isDev: true });
      deps.set('postcss', { version: DEV_DEPS['postcss'], isDev: true });
    }
  
    return deps;
  }
  
  function getPackageName(source: string): string | null {
    if (source.startsWith('.') || source.startsWith('/')) return null;
    if (source.startsWith('@')) {
      const parts = source.split('/');
      return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : null;
    }
    return source.split('/')[0];
  }
  
  // ============================================================================
  // FILE GENERATORS
  // ============================================================================
  
  function generatePackageJson(
    artifact: ParsedArtifact,
    projectName: string,
    detectedDeps: Map<string, { version: string; isDev: boolean }>
  ): ProjectFile {
    const deps: Record<string, string> = {};
    const devDeps: Record<string, string> = {
      'vite': DEV_DEPS['vite'],
      '@vitejs/plugin-react': DEV_DEPS['@vitejs/plugin-react'],
    };
  
    // Add detected dependencies
    for (const [name, info] of detectedDeps) {
      if (info.isDev) {
        devDeps[name] = info.version;
      } else {
        deps[name] = info.version;
      }
    }
  
    // Add artifact's parsed dependencies
    for (const dep of artifact.dependencies) {
      if (dep.isDev) {
        devDeps[dep.name] = devDeps[dep.name] || dep.version;
      } else {
        deps[dep.name] = deps[dep.name] || dep.version;
      }
    }
  
    // Ensure React is present
    deps['react'] = deps['react'] || RUNTIME_DEPS['react'];
    deps['react-dom'] = deps['react-dom'] || RUNTIME_DEPS['react-dom'];
  
    // TypeScript deps
    if (artifact.usesTypeScript) {
      devDeps['typescript'] = DEV_DEPS['typescript'];
      devDeps['@types/react'] = DEV_DEPS['@types/react'];
      devDeps['@types/react-dom'] = DEV_DEPS['@types/react-dom'];
    }
  
    const packageJson = {
      name: sanitizePackageName(projectName),
      private: true,
      version: '0.0.1',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
        lint: 'eslint .',
      },
      dependencies: sortObject(deps),
      devDependencies: sortObject(devDeps),
    };
  
    return {
      path: 'package.json',
      content: JSON.stringify(packageJson, null, 2),
    };
  }
  
  function generateViteConfig(artifact: ParsedArtifact): ProjectFile {
    const ext = artifact.usesTypeScript ? 'ts' : 'js';
  
    const content = `import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react';
  
  export default defineConfig({
    plugins: [react()],
    server: {
      port: 3000,
      open: true,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'esbuild',
      target: 'esnext',
    },
    resolve: {
      alias: {
        '@': '/src',
      },
    },
  });
  `;
  
    return { path: `vite.config.${ext}`, content };
  }
  
  function generateIndexHtml(projectName: string, usesTypeScript: boolean = false): ProjectFile {
    const ext = usesTypeScript ? 'tsx' : 'jsx';
    const content = `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <link rel="icon" type="image/svg+xml" href="/vite.svg" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="description" content="${escapeHtml(projectName)} - Built with Alfred" />
      <title>${escapeHtml(projectName)}</title>
    </head>
    <body>
      <div id="root"></div>
      <script type="module" src="/src/main.${ext}"></script>
    </body>
  </html>
  `;
  
    return { path: 'index.html', content };
  }
  
  function generateMainEntry(artifact: ParsedArtifact): ProjectFile {
    const ext = artifact.usesTypeScript ? 'tsx' : 'jsx';
  
    const content = `import React from 'react';
  import ReactDOM from 'react-dom/client';
  import App from './App';
  import './index.css';
  
  const root = document.getElementById('root');
  
  if (root) {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } else {
    console.error('Root element not found');
  }
  `;
  
    return { path: `src/main.${ext}`, content };
  }
  
  function generateComponentFile(artifact: ParsedArtifact): ProjectFile {
    const ext = artifact.usesTypeScript ? 'tsx' : 'jsx';
  
    return {
      path: `src/${artifact.componentName}.${ext}`,
      content: artifact.code,
    };
  }
  
  function generateAppWrapper(artifact: ParsedArtifact): ProjectFile {
    const ext = artifact.usesTypeScript ? 'tsx' : 'jsx';
    const componentName = artifact.componentName;
  
    const content = `import React from 'react';
  import ${componentName} from './${componentName}';
  
  function App() {
    return (
      <div className="app">
        <${componentName} />
      </div>
    );
  }
  
  export default App;
  `;
  
    return { path: `src/App.${ext}`, content };
  }
  
  function generateTailwindConfig(): ProjectFile {
    const content = `/** @type {import('tailwindcss').Config} */
  export default {
    content: [
      './index.html',
      './src/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
      extend: {
        fontFamily: {
          sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        },
      },
    },
    plugins: [],
  };
  `;
  
    return { path: 'tailwind.config.js', content };
  }
  
  function generatePostcssConfig(): ProjectFile {
    const content = `export default {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  };
  `;
  
    return { path: 'postcss.config.js', content };
  }
  
  function generateGlobalCss(): ProjectFile {
    const content = `@tailwind base;
  @tailwind components;
  @tailwind utilities;
  
  :root {
    font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.5;
    font-weight: 400;
    color-scheme: light dark;
    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  
  html, body {
    min-height: 100vh;
    width: 100%;
  }
  
  body {
    display: flex;
    flex-direction: column;
  }
  
  #root {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
  
  .app {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  `;
  
    return { path: 'src/index.css', content };
  }
  
  function generateBasicCss(): ProjectFile {
    const content = `*, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  
  :root {
    font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.5;
    font-weight: 400;
    color-scheme: light dark;
    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  
  html, body {
    min-height: 100vh;
    width: 100%;
  }
  
  body {
    display: flex;
    flex-direction: column;
  }
  
  #root {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
  
  .app {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  `;
  
    return { path: 'src/index.css', content };
  }
  
  function generateTsConfig(): ProjectFile {
    const content = {
      compilerOptions: {
        target: 'ES2020',
        useDefineForClassFields: true,
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        skipLibCheck: true,
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: 'react-jsx',
        strict: true,
        noUnusedLocals: false,
        noUnusedParameters: false,
        noFallthroughCasesInSwitch: true,
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        forceConsistentCasingInFileNames: true,
        paths: {
          '@/*': ['./src/*'],
        },
      },
      include: ['src'],
      references: [{ path: './tsconfig.node.json' }],
    };
  
    return { path: 'tsconfig.json', content: JSON.stringify(content, null, 2) };
  }
  
  function generateTsConfigNode(): ProjectFile {
    const content = {
      compilerOptions: {
        composite: true,
        skipLibCheck: true,
        module: 'ESNext',
        moduleResolution: 'bundler',
        allowSyntheticDefaultImports: true,
      },
      include: ['vite.config.ts'],
    };
  
    return { path: 'tsconfig.node.json', content: JSON.stringify(content, null, 2) };
  }
  
  function generateGitignore(): ProjectFile {
    const content = `# Dependencies
  node_modules
  .pnp
  .pnp.js
  
  # Build outputs
  dist
  dist-ssr
  *.local
  build
  
  # Editor
  .vscode/*
  !.vscode/extensions.json
  .idea
  *.swp
  *.swo
  
  # Logs
  logs
  *.log
  npm-debug.log*
  yarn-debug.log*
  yarn-error.log*
  pnpm-debug.log*
  
  # OS
  .DS_Store
  Thumbs.db
  
  # Environment
  .env
  .env.local
  .env.development.local
  .env.test.local
  .env.production.local
  
  # Testing
  coverage
  .nyc_output
  
  # Cache
  .cache
  .parcel-cache
  .eslintcache
  `;
  
    return { path: '.gitignore', content };
  }
  
  function generateNpmrc(): ProjectFile {
    // Use legacy-peer-deps to handle potential peer dependency conflicts
    // especially with Three.js ecosystem packages
    const content = `legacy-peer-deps=true
  `;
  
    return { path: '.npmrc', content };
  }
  
  function generateVercelJson(): ProjectFile {
    const content = {
      $schema: 'https://openapi.vercel.sh/vercel.json',
      framework: 'vite',
      buildCommand: 'npm run build',
      outputDirectory: 'dist',
      installCommand: 'npm install --legacy-peer-deps',
      devCommand: 'npm run dev',
    };
  
    return { path: 'vercel.json', content: JSON.stringify(content, null, 2) };
  }
  
  // ============================================================================
  // UTILITIES
  // ============================================================================
  
  export function sanitizePackageName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 214) || 'alfred-project';
  }
  
  function sortObject(obj: Record<string, string>): Record<string, string> {
    return Object.keys(obj)
      .sort()
      .reduce((acc, key) => {
        acc[key] = obj[key];
        return acc;
      }, {} as Record<string, string>);
  }
  
  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  export { generatePackageJson, generateViteConfig };