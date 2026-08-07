// config/EnvVar.js
class EnvVar {
  constructor(key, options = {}) {
    this.key = key;
    this.fallback = options.fallback;
    this.required = options.required !== false; // default true
  }

  value() {
    const val = process.env[this.key] ?? this.fallback;

    if (val === undefined && this.required) {
      throw new Error(`Missing required env var: ${this.key}`);
    }

    return val;
  }
}

export default EnvVar;
