# -*- encoding: utf-8 -*-
# stub: anthropic 1.25.0 ruby lib

Gem::Specification.new do |s|
  s.name = "anthropic".freeze
  s.version = "1.25.0".freeze

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.metadata = { "homepage_uri" => "https://gemdocs.org/gems/anthropic", "rubygems_mfa_required" => "false", "source_code_uri" => "https://github.com/anthropics/anthropic-sdk-ruby" } if s.respond_to? :metadata=
  s.require_paths = ["lib".freeze]
  s.authors = ["Anthropic".freeze]
  s.date = "2026-03-18"
  s.email = "support@anthropic.com".freeze
  s.extra_rdoc_files = ["README.md".freeze]
  s.files = ["README.md".freeze]
  s.homepage = "https://gemdocs.org/gems/anthropic".freeze
  s.licenses = ["MIT".freeze]
  s.required_ruby_version = Gem::Requirement.new(">= 3.2.0".freeze)
  s.rubygems_version = "3.5.10".freeze
  s.summary = "Ruby library to access the Anthropic API".freeze

  s.installed_by_version = "3.5.10".freeze if s.respond_to? :installed_by_version

  s.specification_version = 4

  s.add_runtime_dependency(%q<cgi>.freeze, [">= 0".freeze])
  s.add_runtime_dependency(%q<connection_pool>.freeze, [">= 0".freeze])
end
