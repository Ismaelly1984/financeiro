#!/bin/bash

# Navigate to the source directory
cd ../src

# Run the sitemap generator
node index.js

# Move the generated sitemap to the root directory
mv sitemap.xml ../meufinanceiro-sitemap.xml

# Print a success message
echo "Sitemap has been generated successfully!"