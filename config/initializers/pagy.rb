require "pagy/extras/overflow"

Pagy::DEFAULT[:limit] = 24
Pagy::DEFAULT[:overflow] = :last_page
